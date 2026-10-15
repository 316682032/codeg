use sea_orm::entity::prelude::*;

/// What the user wrote before the composer translated it, keyed by a sha256 of
/// the message as sent. The user's own words, not a cache. See
/// `m20261016_000001_translation_original`.
#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "translation_original")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false, column_type = "Text")]
    pub sent_key: String,
    #[sea_orm(column_type = "Text")]
    pub original: String,
    pub created_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
