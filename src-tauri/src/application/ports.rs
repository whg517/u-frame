use crate::domain::layout::LayoutSnapshot;
use std::future::Future;

/// Stable persistence failure. The adapter never exposes SQL or database paths.
#[derive(Debug)]
pub(crate) struct StorageError {
    pub code: &'static str,
    pub message: &'static str,
}

pub(crate) struct NewPlacement {
    pub id: String,
    pub asset_id: String,
    pub rack_id: String,
    pub start_u: i32,
    pub height_u: i32,
    pub placed_at: String,
}

/// Application-owned port: the SQLite adapter implements this contract.
pub(crate) trait LayoutRepository: Sync {
    type Transaction: LayoutTransaction;
    fn begin_layout(&self) -> impl Future<Output = Result<Self::Transaction, StorageError>> + Send;
}

pub(crate) trait LayoutTransaction: Send {
    // Contract: one consistent snapshot and all writes belong to this transaction.
    // Drop without a successful commit MUST roll back every write.
    fn snapshot(&mut self) -> impl Future<Output = Result<LayoutSnapshot, StorageError>> + Send;
    fn end_placement(
        &mut self,
        id: &str,
        changed_at: &str,
    ) -> impl Future<Output = Result<(), StorageError>> + Send;
    fn insert_placement(
        &mut self,
        placement: &NewPlacement,
    ) -> impl Future<Output = Result<(), StorageError>> + Send;
    fn commit(self) -> impl Future<Output = Result<(), StorageError>> + Send;
}
