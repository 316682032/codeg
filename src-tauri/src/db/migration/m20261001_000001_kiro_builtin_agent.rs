//! Placeholder for the fork's first Kiro retirement migration.
//!
//! keh4l/codeg shipped the custom-to-built-in Kiro migration under this name
//! before upstream merged it as `m20261015_000001_kiro_builtin_agent`. Every
//! fork database from 0.32.4-1 on has this version recorded, and sea-orm
//! refuses to start when a recorded migration's file is gone, so the name has
//! to stay registered.
//!
//! The work itself now lives in the upstream migration, which does everything
//! this one did (plus moving tags and delegation defaults) and only touches
//! rows still typed `custom:kiro-cli`, so running it after this one is safe.
//! This one does nothing. It is registered in name order like every other
//! migration (`migrations_are_listed_in_name_order`), so the upstream
//! migration's tests look theirs up by its full name.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}
