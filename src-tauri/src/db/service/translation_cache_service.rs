use std::collections::HashMap;

use chrono::{Duration, Utc};
use sea_orm::sea_query::OnConflict;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DbBackend, EntityTrait, QueryFilter, Set,
    Statement,
};

use crate::db::entities::translation_cache;
use crate::db::error::DbError;

/// Rows older than this are dropped on prune.
pub const MAX_AGE_DAYS: i64 = 30;
/// At most this many rows are kept, newest first.
pub const MAX_ROWS: u64 = 20_000;

/// SQLite caps the number of bound parameters per statement; stay well under.
const CHUNK: usize = 500;

pub async fn get_many(
    conn: &DatabaseConnection,
    keys: &[String],
) -> Result<HashMap<String, String>, DbError> {
    let mut found = HashMap::new();
    for chunk in keys.chunks(CHUNK) {
        let rows = translation_cache::Entity::find()
            .filter(translation_cache::Column::CacheKey.is_in(chunk.iter().cloned()))
            .all(conn)
            .await?;
        found.extend(rows.into_iter().map(|r| (r.cache_key, r.translated)));
    }
    Ok(found)
}

pub async fn put_many(
    conn: &DatabaseConnection,
    entries: Vec<(String, String)>,
) -> Result<(), DbError> {
    let now = Utc::now();
    for chunk in entries.chunks(CHUNK) {
        let models = chunk
            .iter()
            .map(|(key, translated)| translation_cache::ActiveModel {
                cache_key: Set(key.clone()),
                translated: Set(translated.clone()),
                created_at: Set(now),
            });
        translation_cache::Entity::insert_many(models)
            .on_conflict(
                OnConflict::column(translation_cache::Column::CacheKey)
                    .update_columns([
                        translation_cache::Column::Translated,
                        translation_cache::Column::CreatedAt,
                    ])
                    .to_owned(),
            )
            .exec(conn)
            .await?;
    }
    Ok(())
}

/// Drop rows past [`MAX_AGE_DAYS`], then all but the newest [`MAX_ROWS`].
/// Returns how many rows went.
pub async fn prune(conn: &DatabaseConnection) -> Result<u64, DbError> {
    let cutoff = Utc::now() - Duration::days(MAX_AGE_DAYS);
    let aged = translation_cache::Entity::delete_many()
        .filter(translation_cache::Column::CreatedAt.lt(cutoff))
        .exec(conn)
        .await?
        .rows_affected;
    let overflow = conn
        .execute(Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "DELETE FROM translation_cache WHERE cache_key IN \
             (SELECT cache_key FROM translation_cache ORDER BY created_at DESC LIMIT -1 OFFSET ?)",
            [MAX_ROWS.into()],
        ))
        .await?
        .rows_affected();
    Ok(aged + overflow)
}

pub async fn clear(conn: &DatabaseConnection) -> Result<u64, DbError> {
    Ok(translation_cache::Entity::delete_many()
        .exec(conn)
        .await?
        .rows_affected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::fresh_in_memory_db;

    #[tokio::test]
    async fn entries_round_trip_and_overwrite() {
        let db = fresh_in_memory_db().await;
        put_many(
            &db.conn,
            vec![("a".into(), "甲".into()), ("b".into(), "乙".into())],
        )
        .await
        .expect("put");
        put_many(&db.conn, vec![("a".into(), "甲二".into())])
            .await
            .expect("overwrite");
        let found = get_many(&db.conn, &["a".into(), "b".into(), "c".into()])
            .await
            .expect("get");
        assert_eq!(found.len(), 2);
        assert_eq!(found["a"], "甲二");
        assert_eq!(found["b"], "乙");
    }

    #[tokio::test]
    async fn prune_drops_aged_rows_and_clear_drops_everything() {
        let db = fresh_in_memory_db().await;
        put_many(&db.conn, vec![("fresh".into(), "新".into())])
            .await
            .expect("put");
        translation_cache::Entity::insert(translation_cache::ActiveModel {
            cache_key: Set("old".into()),
            translated: Set("旧".into()),
            created_at: Set(Utc::now() - Duration::days(MAX_AGE_DAYS + 1)),
        })
        .exec(&db.conn)
        .await
        .expect("insert old");

        assert_eq!(prune(&db.conn).await.expect("prune"), 1);
        let found = get_many(&db.conn, &["fresh".into(), "old".into()])
            .await
            .expect("get");
        assert_eq!(found.keys().collect::<Vec<_>>(), vec!["fresh"]);

        assert_eq!(clear(&db.conn).await.expect("clear"), 1);
    }
}
