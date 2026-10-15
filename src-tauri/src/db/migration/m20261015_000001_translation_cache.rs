use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // translation_cache: finished translations, so reopening a conversation
        // shows its translated replies at once instead of paying for them again.
        // Keyed by a sha256 of (source language, target language, glossary,
        // text) — see `translation::cache_key`. Pure cache: rows older than 30
        // days, or past the newest 20,000, are pruned (`translation_cache_service`).
        manager
            .create_table(
                Table::create()
                    .table(TranslationCache::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TranslationCache::CacheKey)
                            .text()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(TranslationCache::Translated)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TranslationCache::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_translation_cache_created_at")
                    .table(TranslationCache::Table)
                    .col(TranslationCache::CreatedAt)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TranslationCache::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum TranslationCache {
    Table,
    CacheKey,
    Translated,
    CreatedAt,
}
