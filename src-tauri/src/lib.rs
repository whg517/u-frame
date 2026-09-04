pub mod application;
pub mod commands;
pub mod domain;
pub mod dto;
pub mod error;
pub mod infrastructure;
pub mod state;

use std::fs;

use tauri::Manager;
use tauri_specta::{Builder, collect_commands};

#[cfg(debug_assertions)]
pub fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::list_locations,
        commands::create_room,
        commands::create_area,
        commands::list_racks,
        commands::create_rack,
        commands::list_assets,
        commands::create_asset,
        commands::place_asset,
        commands::get_rack_view,
        commands::reorder_racks,
        commands::seed_dev_data,
    ])
}

#[cfg(not(debug_assertions))]
pub fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::list_locations,
        commands::create_room,
        commands::create_area,
        commands::list_racks,
        commands::create_rack,
        commands::list_assets,
        commands::create_asset,
        commands::place_asset,
        commands::get_rack_view,
        commands::reorder_racks,
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let specta = specta_builder();
    tauri::Builder::default()
        .invoke_handler(specta.invoke_handler())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_dir)?;
            let database_path = app_data_dir.join("uframe.sqlite3");
            let state =
                tauri::async_runtime::block_on(state::AppState::initialize(&database_path))?;
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
