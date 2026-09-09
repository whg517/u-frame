use super::database_error::classify_database_error;
use crate::{
    application::ports::{LayoutRepository, LayoutTransaction, NewPlacement, StorageError},
    domain::layout::{ActivePlacement, LayoutSnapshot},
};
use sqlx::{FromRow, Sqlite, SqlitePool, Transaction};

pub(crate) struct SqliteLayoutTransaction(Transaction<'static, Sqlite>);

impl LayoutRepository for SqlitePool {
    type Transaction = SqliteLayoutTransaction;
    async fn begin_layout(&self) -> Result<Self::Transaction, StorageError> {
        self.begin()
            .await
            .map(SqliteLayoutTransaction)
            .map_err(classify_database_error)
    }
}

#[derive(FromRow)]
struct ActiveRow {
    id: String,
    rack_id: String,
    asset_id: String,
    start_u: i32,
    height_u: i32,
    asset_status: String,
}

impl LayoutTransaction for SqliteLayoutTransaction {
    async fn snapshot(&mut self) -> Result<LayoutSnapshot, StorageError> {
        let rows = sqlx::query_as::<_, ActiveRow>(
            "SELECT p.id, p.rack_id, p.asset_id, p.start_u, p.height_u, a.status AS asset_status
             FROM rack_placements p JOIN assets a ON a.id = p.asset_id
             WHERE p.removed_at IS NULL ORDER BY p.id",
        )
        .fetch_all(&mut *self.0)
        .await
        .map_err(classify_database_error)?;
        let racks =
            sqlx::query_as::<_, (String, i32, String)>("SELECT id, total_u, status FROM racks")
                .fetch_all(&mut *self.0)
                .await
                .map_err(classify_database_error)?
                .into_iter()
                .map(|(id, total_u, status)| (id, (total_u, status)))
                .collect();
        Ok(LayoutSnapshot {
            racks,
            placements: rows
                .into_iter()
                .map(|r| ActivePlacement {
                    id: r.id,
                    rack_id: r.rack_id,
                    asset_id: r.asset_id,
                    start_u: r.start_u,
                    height_u: r.height_u,
                    asset_status: r.asset_status,
                })
                .collect(),
        })
    }

    async fn end_placement(&mut self, id: &str, changed_at: &str) -> Result<(), StorageError> {
        let changed = sqlx::query(
            "UPDATE rack_placements SET removed_at = ? WHERE id = ? AND removed_at IS NULL",
        )
        .bind(changed_at)
        .bind(id)
        .execute(&mut *self.0)
        .await
        .map_err(classify_database_error)?;
        if changed.rows_affected() != 1 {
            return Err(StorageError {
                code: "Placement.AssetNotPlaced",
                message: "设备尚未上架",
            });
        }
        Ok(())
    }

    async fn insert_placement(&mut self, p: &NewPlacement) -> Result<(), StorageError> {
        sqlx::query("INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at)
                    VALUES (?, ?, ?, ?, ?, ?, NULL)")
            .bind(&p.id).bind(&p.rack_id).bind(&p.asset_id).bind(p.start_u).bind(p.height_u).bind(&p.placed_at)
            .execute(&mut *self.0).await.map_err(classify_database_error)?;
        Ok(())
    }

    async fn commit(self) -> Result<(), StorageError> {
        self.0.commit().await.map_err(classify_database_error)
    }
}
