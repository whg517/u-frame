mod assets;
mod locations;
mod mapping;
mod placements;
mod rack_view;
mod racks;
#[cfg(debug_assertions)]
mod seed;
#[cfg(test)]
mod tests;

pub use assets::{create_asset, list_assets, update_asset};
pub use locations::{create_area, create_room, list_locations, update_area, update_room};
pub use placements::{move_asset, move_assets, place_asset, unplace_asset};
pub use rack_view::get_rack_view;
pub use racks::{create_rack, list_racks, reorder_racks, update_rack};
#[cfg(debug_assertions)]
pub use seed::seed_dev_data;

use mapping::{area_dto, asset_dto, rack_dto, room_dto};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};
use uuid::Uuid;

fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .expect("RFC 3339 formatting must succeed")
}

fn id() -> String {
    Uuid::now_v7().to_string()
}
