use std::path::Path;

use sqlx::SqlitePool;

use crate::infrastructure::database;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
}

impl AppState {
    pub async fn initialize(database_path: &Path) -> Result<Self, sqlx::Error> {
        Ok(Self {
            pool: database::connect(database_path).await?,
        })
    }

    #[cfg(test)]
    pub async fn test() -> Result<Self, sqlx::Error> {
        Ok(Self {
            pool: database::connect_test().await?,
        })
    }
}
