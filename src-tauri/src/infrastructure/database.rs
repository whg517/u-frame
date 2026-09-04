use std::{path::Path, str::FromStr, time::Duration};

use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

pub async fn connect(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str(&format!("sqlite://{}", path.display()))?
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .busy_timeout(Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(4)
        .connect_with(options)
        .await?;
    MIGRATOR.run(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
pub async fn connect_test() -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::from_str("sqlite::memory:")?
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Memory)
        .synchronous(SqliteSynchronous::Normal);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    MIGRATOR.run(&pool).await?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::connect_test;

    async fn insert_structure(pool: &sqlx::SqlitePool) {
        sqlx::query(
            "INSERT INTO rooms VALUES ('room', 'DC', '机房', NULL, 'active', 'now', 'now')",
        )
        .execute(pool)
        .await
        .unwrap();
        sqlx::query(
            "INSERT INTO areas VALUES ('area', 'room', 'A', 'A 区', NULL, 'active', 'now', 'now')",
        )
        .execute(pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO racks (id, area_id, code, specification, total_u, power_capacity_w, status, notes, created_at, updated_at) VALUES ('rack', 'area', 'A-01', '18U', 18, NULL, 'active', NULL, 'now', 'now')")
            .execute(pool)
            .await
            .unwrap();
        for asset_id in ["asset-1", "asset-2", "asset-3"] {
            sqlx::query("INSERT INTO assets (id, type, name, height_u, status, created_at, updated_at) VALUES (?, 'server', ?, 2, 'active', 'now', 'now')")
                .bind(asset_id)
                .bind(asset_id)
                .execute(pool)
                .await
                .unwrap();
        }
    }

    #[tokio::test]
    async fn migration_trigger_rejects_overlap_and_out_of_range() {
        let pool = connect_test().await.unwrap();
        insert_structure(&pool).await;
        sqlx::query(
            "INSERT INTO rack_placements VALUES ('p1', 'rack', 'asset-1', 4, 2, 'now', NULL)",
        )
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            "INSERT INTO rack_placements VALUES ('p2', 'rack', 'asset-2', 6, 2, 'now', NULL)",
        )
        .execute(&pool)
        .await
        .expect("adjacent placement must be accepted");
        let overlap = sqlx::query(
            "INSERT INTO rack_placements VALUES ('p3', 'rack', 'asset-3', 5, 2, 'now', NULL)",
        )
        .execute(&pool)
        .await
        .unwrap_err();
        assert!(overlap.to_string().contains("Placement.Overlap"));

        sqlx::query("UPDATE assets SET height_u = 2 WHERE id = 'asset-3'")
            .execute(&pool)
            .await
            .unwrap();
        let out_of_range = sqlx::query(
            "INSERT INTO rack_placements VALUES ('p4', 'rack', 'asset-3', 18, 2, 'now', NULL)",
        )
        .execute(&pool)
        .await
        .unwrap_err();
        assert!(out_of_range.to_string().contains("Placement.OutOfRange"));
    }
}
