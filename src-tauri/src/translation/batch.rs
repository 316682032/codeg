//! Several segments in one request, and the checks a translation must pass.
//!
//! The paragraphs of a reply go to the engine together, packed as
//! `<p0>…</p0><p1>…</p1>`: the model translates each in the context of the
//! rest (a pronoun, a term defined two paragraphs up), and a whole reply costs
//! one of the 60 requests a minute Bailian allows each qwen-mt model. Every
//! model kept every tag (tested 2026-10-15). Numbered tags rather than a bare
//! separator, so a dropped or merged segment is detected instead of shifting
//! every later one.

use std::sync::LazyLock;

use regex::Regex;

/// The most one call carries. qwen-mt takes 8,192 tokens in and 8,192 out
/// (the glossary counts as input); 6,000 characters of Chinese stays inside
/// both in either direction. Time grows with length: qwen-mt-flash took 1.3s
/// for 1,000 characters of English, 3.0s for 3,000 and 6.2s for 6,000
/// (2026-10-15), so a longer reply is split into calls that run in parallel.
pub const MAX_BATCH_CHARS: usize = 6000;

/// Placeholders the frontend puts where code, mentions and the like were cut
/// out (`⟦C0⟧`, `⟦R1⟧`). They must survive translation exactly.
static PLACEHOLDER: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"⟦[A-Z]\d+⟧").expect("placeholder regex"));

/// Group segment indices into calls under [`MAX_BATCH_CHARS`], keeping each
/// group (`groups[i]` is segment `i`'s) whole: groups are packed together while
/// they fit, and a group too long for one call is split between its segments.
/// A single segment longer than the limit gets a call of its own.
pub fn plan_batches(texts: &[String], groups: &[u32]) -> Vec<Vec<usize>> {
    // Each group's segments, groups in order of first appearance.
    let mut order: Vec<u32> = Vec::new();
    let mut members: std::collections::HashMap<u32, Vec<usize>> = Default::default();
    for (index, &group) in groups.iter().enumerate().take(texts.len()) {
        members
            .entry(group)
            .or_insert_with(|| {
                order.push(group);
                Vec::new()
            })
            .push(index);
    }
    let len = |i: usize| texts[i].chars().count();

    let mut batches: Vec<Vec<usize>> = Vec::new();
    let mut current: Vec<usize> = Vec::new();
    let mut size = 0;
    for group in order {
        let indices = &members[&group];
        let group_size: usize = indices.iter().map(|&i| len(i)).sum();
        if group_size <= MAX_BATCH_CHARS {
            if !current.is_empty() && size + group_size > MAX_BATCH_CHARS {
                batches.push(std::mem::take(&mut current));
                size = 0;
            }
            current.extend(indices);
            size += group_size;
            continue;
        }
        // Too long for one call: split between paragraphs, in order.
        if !current.is_empty() {
            batches.push(std::mem::take(&mut current));
            size = 0;
        }
        for &index in indices {
            if !current.is_empty() && size + len(index) > MAX_BATCH_CHARS {
                batches.push(std::mem::take(&mut current));
                size = 0;
            }
            current.push(index);
            size += len(index);
        }
        batches.push(std::mem::take(&mut current));
        size = 0;
    }
    if !current.is_empty() {
        batches.push(current);
    }
    batches
}

/// One segment goes out as-is; several are wrapped in numbered tags.
pub fn pack(texts: &[&str]) -> String {
    if let [only] = texts {
        return only.to_string();
    }
    texts
        .iter()
        .enumerate()
        .map(|(i, text)| format!("<p{i}>{text}</p{i}>"))
        .collect::<Vec<_>>()
        .join("\n")
}

/// The inverse of [`pack`]. `None` when any tag is missing.
pub fn unpack(output: &str, count: usize) -> Option<Vec<String>> {
    if count == 1 {
        return Some(vec![output.trim().to_string()]);
    }
    let mut segments = Vec::with_capacity(count);
    let mut cursor = 0;
    for i in 0..count {
        let open = format!("<p{i}>");
        let close = format!("</p{i}>");
        let start = cursor + output[cursor..].find(&open)? + open.len();
        let end = start + output[start..].find(&close)?;
        segments.push(output[start..end].trim().to_string());
        cursor = end + close.len();
    }
    Some(segments)
}

/// A translation is usable only if it kept every placeholder exactly once and
/// every inline code span verbatim. Spacing around them may change (hy-mt2
/// drops the space before a code span); their content may not.
pub fn is_faithful(source: &str, translated: &str) -> bool {
    if translated.trim().is_empty() {
        return source.trim().is_empty();
    }
    let mut wanted = placeholders(source);
    let mut got = placeholders(translated);
    wanted.sort_unstable();
    got.sort_unstable();
    if wanted != got {
        return false;
    }
    match (code_spans(source), code_spans(translated)) {
        (Some(mut a), Some(mut b)) => {
            a.sort_unstable();
            b.sort_unstable();
            a == b
        }
        // An unbalanced backtick in the source: nothing reliable to compare.
        (None, _) => true,
        (Some(_), None) => false,
    }
}

fn placeholders(text: &str) -> Vec<&str> {
    PLACEHOLDER.find_iter(text).map(|m| m.as_str()).collect()
}

/// Contents of single-backtick spans, or `None` when the backticks do not
/// pair up.
fn code_spans(text: &str) -> Option<Vec<&str>> {
    let parts: Vec<&str> = text.split('`').collect();
    if parts.len().is_multiple_of(2) {
        return None;
    }
    Some(
        parts
            .iter()
            .skip(1)
            .step_by(2)
            .copied()
            .filter(|s| !s.is_empty())
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn owned(items: &[&str]) -> Vec<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn a_single_segment_is_sent_bare() {
        assert_eq!(pack(&["Hello"]), "Hello");
        assert_eq!(unpack("  你好\n", 1), Some(vec!["你好".to_string()]));
    }

    #[test]
    fn segments_round_trip_through_numbered_tags() {
        let packed = pack(&["One.", "Two\n\n- a\n- b"]);
        assert_eq!(packed, "<p0>One.</p0>\n<p1>Two\n\n- a\n- b</p1>");
        // The shape the models actually return: blank lines around tags, the
        // inside re-indented, the whole thing translated.
        let answer = "<p0>一。</p0>\n\n<p1>二\n\n- 甲\n- 乙\n</p1>\n";
        assert_eq!(
            unpack(answer, 2),
            Some(vec!["一。".to_string(), "二\n\n- 甲\n- 乙".to_string()])
        );
    }

    #[test]
    fn a_missing_or_merged_segment_is_detected() {
        assert_eq!(unpack("<p0>一。二。</p0>", 2), None);
        assert_eq!(unpack("<p0>一</p0><p1>二", 2), None);
        assert_eq!(unpack("一。二。", 2), None);
    }

    #[test]
    fn a_group_goes_in_one_call_whatever_its_paragraph_count() {
        let paragraph = "p".repeat(500);
        let texts = vec![paragraph; 11];
        assert_eq!(plan_batches(&texts, &[0; 11]), vec![(0..11).collect::<Vec<_>>()]);
        assert!(plan_batches(&[], &[]).is_empty());
    }

    #[test]
    fn groups_are_packed_together_but_never_split_to_fit() {
        let half = "h".repeat(MAX_BATCH_CHARS / 2);
        let texts = owned(&[&half, &half, "short", &half, "tail"]);
        // Group 1 (`short` + the second `half`) would overflow the first call:
        // it moves to the next one whole, rather than leaving `short` behind.
        assert_eq!(
            plan_batches(&texts, &[0, 0, 1, 1, 2]),
            vec![vec![0, 1], vec![2, 3, 4]]
        );
    }

    #[test]
    fn a_group_too_long_for_one_call_is_split_between_paragraphs() {
        let big = "x".repeat(MAX_BATCH_CHARS - 3);
        let texts = owned(&[
            "before",
            &big,
            "short",
            &"y".repeat(MAX_BATCH_CHARS + 5),
            "after",
        ]);
        assert_eq!(
            plan_batches(&texts, &[0, 1, 1, 1, 2]),
            vec![vec![0], vec![1], vec![2], vec![3], vec![4]]
        );
    }

    #[test]
    fn placeholders_must_survive_exactly_once() {
        assert!(is_faithful("Run ⟦C0⟧ then ⟦R1⟧", "先运行 ⟦C0⟧，再 ⟦R1⟧"));
        assert!(!is_faithful("Run ⟦C0⟧", "运行"));
        assert!(!is_faithful("Run ⟦C0⟧", "运行 ⟦C0⟧ ⟦C0⟧"));
        assert!(!is_faithful("Run it", "运行 ⟦C9⟧"));
    }

    #[test]
    fn code_spans_must_survive_verbatim_but_spacing_may_change() {
        assert!(is_faithful(
            "Call `useEditor` with `deps`.",
            "用`deps`调用`useEditor`。"
        ));
        assert!(!is_faithful("Call `useEditor`.", "调用 `使用编辑器`。"));
        assert!(!is_faithful("Call `useEditor`.", "调用 useEditor`。"));
        // An odd backtick in the source leaves nothing to compare.
        assert!(is_faithful("It's a ` mistake", "这是个错误"));
    }

    #[test]
    fn an_empty_translation_is_never_faithful() {
        assert!(!is_faithful("Hello", "  "));
        assert!(is_faithful("", ""));
    }
}
