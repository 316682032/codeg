//! Picks the glossary terms a request needs.
//!
//! Only terms that actually occur in the text are sent: qwen-mt counts `terms`
//! toward its input-token limit, and hy-mt2 gets them as prompt lines, so an
//! unused term costs tokens and can only distract.

use crate::models::translation::GlossaryEntry;

use super::languages;

/// Terms the engines get wrong in a coding context without help. Applied only
/// between Chinese and another language, since they are Chinese renderings.
const BUILT_IN: &[(&str, &str)] = &[
    ("agent", "智能体"),
    ("prompt", "提示词"),
    ("session", "会话"),
];

/// A term pair oriented the way this request translates.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Term {
    pub source: String,
    pub target: String,
}

/// The user's entries take precedence over a built-in one with the same source.
pub fn terms_for(texts: &[String], user: &[GlossaryEntry], target: &str) -> Vec<Term> {
    struct Pair {
        a: String,
        b: String,
        /// Built-ins are English ↔ Chinese only: `a` English, `b` Chinese.
        built_in: bool,
    }
    let mut pairs: Vec<Pair> = user
        .iter()
        .filter(|e| !e.source.trim().is_empty() && !e.target.trim().is_empty())
        .map(|e| Pair {
            a: e.source.trim().to_string(),
            b: e.target.trim().to_string(),
            built_in: false,
        })
        .collect();
    for (english, chinese) in BUILT_IN {
        let taken = pairs.iter().any(|p| {
            p.a.eq_ignore_ascii_case(english)
                || p.b.eq_ignore_ascii_case(english)
                || p.a == *chinese
                || p.b == *chinese
        });
        if !taken {
            pairs.push(Pair {
                a: english.to_string(),
                b: chinese.to_string(),
                built_in: true,
            });
        }
    }

    let target_is_chinese = languages::is_chinese(target);
    let target_is_english = target.eq_ignore_ascii_case("en");
    let mut terms = Vec::new();
    for pair in pairs {
        // Orient each pair by which side the text contains.
        let (from, to, toward_b) = if texts.iter().any(|t| contains_term(t, &pair.a)) {
            (pair.a, pair.b, true)
        } else if texts.iter().any(|t| contains_term(t, &pair.b)) {
            (pair.b, pair.a, false)
        } else {
            continue;
        };
        // A built-in only fits English → Chinese or Chinese → English.
        if pair.built_in
            && !(if toward_b {
                target_is_chinese
            } else {
                target_is_english
            })
        {
            continue;
        }
        if !terms.iter().any(|t: &Term| t.source == from) {
            terms.push(Term {
                source: from,
                target: to,
            });
        }
    }
    terms
}

/// ASCII terms match as whole words, case-insensitively (`agent` in "the
/// agent's reply", not in "user-agentive"); anything else matches as a
/// substring, which is how CJK text has to be searched.
fn contains_term(text: &str, term: &str) -> bool {
    if term.is_empty() {
        return false;
    }
    if !term.is_ascii() {
        return text.contains(term);
    }
    let haystack = text.to_ascii_lowercase();
    let needle = term.to_ascii_lowercase();
    let is_word = |c: char| c.is_ascii_alphanumeric() || c == '_';
    let mut from = 0;
    while let Some(pos) = haystack[from..].find(&needle) {
        let start = from + pos;
        let end = start + needle.len();
        let before = haystack[..start].chars().next_back();
        let after = haystack[end..].chars().next();
        if !before.is_some_and(is_word) && !after.is_some_and(is_word) {
            return true;
        }
        from = start + 1;
        while !haystack.is_char_boundary(from) {
            from += 1;
        }
    }
    false
}

/// A stable digest of the user's glossary, folded into the cache key so editing
/// it invalidates translations made under the old one.
pub fn fingerprint(user: &[GlossaryEntry]) -> String {
    user.iter()
        .map(|e| format!("{}\u{1f}{}", e.source.trim(), e.target.trim()))
        .collect::<Vec<_>>()
        .join("\u{1e}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(source: &str, target: &str) -> GlossaryEntry {
        GlossaryEntry {
            source: source.into(),
            target: target.into(),
        }
    }

    fn texts(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn only_terms_present_in_the_text_are_sent() {
        let terms = terms_for(&texts(&["Ask the agent to retry."]), &[], "zh-CN");
        assert_eq!(
            terms,
            vec![Term {
                source: "agent".into(),
                target: "智能体".into()
            }]
        );
    }

    #[test]
    fn a_pair_is_oriented_by_the_side_the_text_contains() {
        let terms = terms_for(&texts(&["让智能体重试"]), &[], "en");
        assert_eq!(
            terms,
            vec![Term {
                source: "智能体".into(),
                target: "agent".into()
            }]
        );
    }

    #[test]
    fn built_ins_stay_out_of_non_chinese_pairs() {
        assert!(terms_for(&texts(&["Ask the agent."]), &[], "ja").is_empty());
    }

    #[test]
    fn user_entries_override_built_ins_and_apply_in_any_pair() {
        let user = [entry("agent", "エージェント")];
        let terms = terms_for(&texts(&["Ask the agent."]), &user, "ja");
        assert_eq!(
            terms,
            vec![Term {
                source: "agent".into(),
                target: "エージェント".into()
            }]
        );
        let user = [entry("agent", "代理")];
        let terms = terms_for(&texts(&["Ask the agent."]), &user, "zh-CN");
        assert_eq!(terms.len(), 1);
        assert_eq!(terms[0].target, "代理");
    }

    #[test]
    fn ascii_terms_match_whole_words_only() {
        assert!(contains_term("The Agent's reply", "agent"));
        assert!(!contains_term("useragentive", "agent"));
        assert!(!contains_term("agent_id", "agent"));
        assert!(contains_term("中文里的agent也算", "agent"));
    }

    #[test]
    fn blank_entries_are_ignored() {
        let user = [entry("  ", "x"), entry("y", "")];
        assert!(terms_for(&texts(&["x y"]), &user, "zh-CN").is_empty());
    }

    #[test]
    fn fingerprint_changes_with_the_glossary() {
        assert_ne!(
            fingerprint(&[entry("a", "b")]),
            fingerprint(&[entry("a", "c")])
        );
        assert_eq!(fingerprint(&[]), "");
    }
}
