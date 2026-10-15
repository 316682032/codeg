//! Language codes the feature accepts and the names each engine wants for them.
//!
//! qwen-mt takes English names (or codes) in `translation_options`; hy-mt2 has
//! no language field at all, so the target goes into a Chinese prompt by its
//! Chinese name. Codes follow the UI's Intl forms (`zh-CN`, not `zh_cn`).

pub struct Language {
    pub code: &'static str,
    pub english: &'static str,
    pub chinese: &'static str,
}

/// Every language here is supported by all offered models, qwen-mt-lite (the
/// narrowest, 31 languages) included.
pub const LANGUAGES: &[Language] = &[
    Language {
        code: "zh-CN",
        english: "Chinese",
        chinese: "简体中文",
    },
    Language {
        code: "zh-TW",
        english: "Traditional Chinese",
        chinese: "繁体中文",
    },
    Language {
        code: "en",
        english: "English",
        chinese: "英语",
    },
    Language {
        code: "ja",
        english: "Japanese",
        chinese: "日语",
    },
    Language {
        code: "ko",
        english: "Korean",
        chinese: "韩语",
    },
    Language {
        code: "es",
        english: "Spanish",
        chinese: "西班牙语",
    },
    Language {
        code: "de",
        english: "German",
        chinese: "德语",
    },
    Language {
        code: "fr",
        english: "French",
        chinese: "法语",
    },
    Language {
        code: "pt",
        english: "Portuguese",
        chinese: "葡萄牙语",
    },
    Language {
        code: "ar",
        english: "Arabic",
        chinese: "阿拉伯语",
    },
    Language {
        code: "ru",
        english: "Russian",
        chinese: "俄语",
    },
    Language {
        code: "it",
        english: "Italian",
        chinese: "意大利语",
    },
];

pub fn find(code: &str) -> Option<&'static Language> {
    LANGUAGES
        .iter()
        .find(|lang| lang.code.eq_ignore_ascii_case(code))
}

/// Chinese (either script) on one side changes which glossary entries apply.
pub fn is_chinese(code: &str) -> bool {
    code.to_ascii_lowercase().starts_with("zh")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_are_found_case_insensitively() {
        assert_eq!(find("zh-cn").map(|l| l.english), Some("Chinese"));
        assert_eq!(find("EN").map(|l| l.chinese), Some("英语"));
        assert!(find("xx").is_none());
    }

    #[test]
    fn chinese_is_recognised_in_both_scripts() {
        assert!(is_chinese("zh-CN"));
        assert!(is_chinese("zh-TW"));
        assert!(!is_chinese("en"));
    }
}
