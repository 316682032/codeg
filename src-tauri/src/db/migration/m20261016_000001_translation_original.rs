use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // translation_original: what the user wrote before the composer
        // translated it, keyed by a sha256 of the message as sent — so a sent
        // message can be switched back to the words its sender typed. Not a
        // cache: these are the user's own words, kept until the user deletes
        // the data directory, and untouched by clearing the translation cache.
        manager
            .create_table(
                Table::create()
                    .table(TranslationOriginal::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TranslationOriginal::SentKey)
                            .text()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(TranslationOriginal::Original)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TranslationOriginal::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(TranslationOriginal::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum TranslationOriginal {
    Table,
    SentKey,
    Original,
    CreatedAt,
}
