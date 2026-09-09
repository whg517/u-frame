use super::{
    id, now,
    ports::{LayoutRepository, LayoutTransaction, NewPlacement, StorageError},
    validation::rule_error,
};
use crate::{
    domain::layout::plan_moves,
    dto::{MoveAssetsInput, MoveAssetsResultDto, PlacementDto},
    error::AppErrorDto,
};

pub(crate) async fn move_assets(
    repository: &impl LayoutRepository,
    input: MoveAssetsInput,
    operation_id: &str,
) -> Result<MoveAssetsResultDto, AppErrorDto> {
    let failure =
        |error: StorageError| AppErrorDto::simple(operation_id, error.code, error.message);
    let mut transaction = repository.begin_layout().await.map_err(failure)?;
    let snapshot = transaction.snapshot().await.map_err(failure)?;
    let moves = input
        .moves
        .into_iter()
        .map(|m| (m.asset_id, m.rack_id, m.start_u))
        .collect();
    let plan = plan_moves(&snapshot, moves).map_err(|error| rule_error(error, operation_id))?;
    let changed_at = now();
    // End all old rows before inserting final positions, so valid swaps are atomic.
    for change in &plan {
        transaction
            .end_placement(&change.previous_id, &changed_at)
            .await
            .map_err(failure)?;
    }
    let mut placements = Vec::with_capacity(plan.len());
    for change in plan {
        let new = NewPlacement {
            id: id(),
            asset_id: change.asset_id,
            rack_id: change.rack_id,
            start_u: change.start_u,
            height_u: change.height_u,
            placed_at: changed_at.clone(),
        };
        transaction.insert_placement(&new).await.map_err(failure)?;
        placements.push(PlacementDto {
            id: new.id,
            asset_id: new.asset_id,
            rack_id: new.rack_id,
            start_u: new.start_u,
            end_u: change.end_u,
            height_u: new.height_u,
            placed_at: new.placed_at,
        });
    }
    transaction.commit().await.map_err(failure)?;
    Ok(MoveAssetsResultDto { placements })
}
