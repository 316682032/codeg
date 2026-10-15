use sea_orm::entity::prelude::*;

/// A finished translation, keyed by a sha256 of what was translated and how.
/// Pure cache: safe to delete at any time. See
/// `m20261015_000001_translation_cache`.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "translation_cache")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub cache_key: String,
    #[sea_orm(column_type = "Text")]
    pub translated: String,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
