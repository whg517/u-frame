use tauri::State;

use crate::{
    application,
    dto::{
        AreaDto, AssetDto, CreateAreaInput, CreateAssetInput, CreateRackInput, CreateRoomInput,
        LocationTreeDto, PlaceAssetInput, PlacementDto, RackDto, RackViewDto, RoomDto,
    },
    error::{AppErrorDto, operation_id},
    state::AppState,
};

#[cfg(debug_assertions)]
use crate::dto::SeedResultDto;

#[tauri::command]
#[specta::specta]
pub async fn list_locations(state: State<'_, AppState>) -> Result<LocationTreeDto, AppErrorDto> {
    let operation_id = operation_id();
    application::list_locations(&state.pool, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_room(
    state: State<'_, AppState>,
    input: CreateRoomInput,
) -> Result<RoomDto, AppErrorDto> {
    let operation_id = operation_id();
    application::create_room(&state.pool, input, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_area(
    state: State<'_, AppState>,
    input: CreateAreaInput,
) -> Result<AreaDto, AppErrorDto> {
    let operation_id = operation_id();
    application::create_area(&state.pool, input, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn list_racks(
    state: State<'_, AppState>,
    area_id: Option<String>,
) -> Result<Vec<RackDto>, AppErrorDto> {
    let operation_id = operation_id();
    application::list_racks(&state.pool, area_id, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_rack(
    state: State<'_, AppState>,
    input: CreateRackInput,
) -> Result<RackDto, AppErrorDto> {
    let operation_id = operation_id();
    application::create_rack(&state.pool, input, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn list_assets(state: State<'_, AppState>) -> Result<Vec<AssetDto>, AppErrorDto> {
    let operation_id = operation_id();
    application::list_assets(&state.pool, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn create_asset(
    state: State<'_, AppState>,
    input: CreateAssetInput,
) -> Result<AssetDto, AppErrorDto> {
    let operation_id = operation_id();
    application::create_asset(&state.pool, input, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn place_asset(
    state: State<'_, AppState>,
    input: PlaceAssetInput,
) -> Result<PlacementDto, AppErrorDto> {
    let operation_id = operation_id();
    application::place_asset(&state.pool, input, &operation_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_rack_view(
    state: State<'_, AppState>,
    area_id: Option<String>,
) -> Result<RackViewDto, AppErrorDto> {
    let operation_id = operation_id();
    application::get_rack_view(&state.pool, area_id, &operation_id).await
}

#[cfg(debug_assertions)]
#[tauri::command]
#[specta::specta]
pub async fn seed_dev_data(state: State<'_, AppState>) -> Result<SeedResultDto, AppErrorDto> {
    let operation_id = operation_id();
    application::seed_dev_data(&state.pool, &operation_id).await
}
