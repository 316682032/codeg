use std::collections::HashMap;

use chrono::Utc;
use sea_orm::sea_query::OnConflict;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};

use crate::db::entities::translation_original;
use crate::db::error::DbError;

/// SQLite caps the number of bound parameters per statement; stay well under.
const CHUNK: usize = 500;

pub async fn get_many(
    conn: &DatabaseConnection,
    keys: &[String],
) -> Result<HashMap<String, String>, DbError> {
    let mut found = HashMap::new();
    for chunk in keys.chunks(CHUNK) {
        let rows = translation_original::Entity::find()
            .filter(translation_original::Column::SentKey.is_in(chunk.iter().cloned()))
            .all(conn)
            .await?;
        found.extend(rows.into_iter().map(|r| (r.sent_key, r.original)));
    }
    Ok(found)
}

/// Every key gets `original`; a key seen before takes the newer one, the way
/// sending the same translation twice means the second original is the one
/// last written.
pub async fn put(
    conn: &DatabaseConnection,
    keys: &[String],
    original: &str,
) -> Result<(), DbError> {
    let now = Utc::now();
    for chunk in keys.chunks(CHUNK) {
        let models = chunk.iter().map(|key| translation_original::ActiveModel {
            sent_key: Set(key.clone()),
            original: Set(original.to_string()),
            created_at: Set(now),
        });
        translation_original::Entity::insert_many(models)
            .on_conflict(
                OnConflict::column(translation_original::Column::SentKey)
                    .update_columns([
                        translation_original::Column::Original,
                        translation_original::Column::CreatedAt,
                    ])
                    .to_owned(),
            )
            .exec(conn)
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_helpers::fresh_in_memory_db;

    #[tokio::test]
    async fn originals_round_trip_and_the_newer_one_wins() {
        let db = fresh_in_memory_db().await;
        put(&db.conn, &["a".into(), "b".into()], "原文一")
            .await
            .expect("put");
        put(&db.conn, &["a".into()], "原文二").await.expect("again");
        let found = get_many(&db.conn, &["a".into(), "b".into(), "c".into()])
            .await
            .expect("get");
        assert_eq!(found.len(), 2);
        assert_eq!(found["a"], "原文二");
        assert_eq!(found["b"], "原文一");
    }
}
