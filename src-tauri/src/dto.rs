use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomInput {
    pub code: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateAreaInput {
    pub room_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateRackInput {
    pub area_id: String,
    pub code: String,
    pub specification: String,
    pub total_u: i32,
    pub power_capacity_w: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssetInput {
    #[serde(rename = "type")]
    pub asset_type: String,
    pub name: String,
    pub hostname: Option<String>,
    pub intranet_ip: Option<String>,
    pub management_ip: Option<String>,
    pub serial_number: Option<String>,
    pub vendor: Option<String>,
    pub model: Option<String>,
    pub purpose: Option<String>,
    pub height_u: i32,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PlaceAssetInput {
    pub asset_id: String,
    pub rack_id: String,
    pub start_u: i32,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoomDto {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AreaDto {
    pub id: String,
    pub room_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoomNodeDto {
    pub room: RoomDto,
    pub areas: Vec<AreaDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LocationTreeDto {
    pub rooms: Vec<RoomNodeDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RackDto {
    pub id: String,
    pub area_id: String,
    pub area_name: String,
    pub room_id: String,
    pub room_name: String,
    pub code: String,
    pub specification: String,
    pub total_u: i32,
    pub power_capacity_w: Option<i32>,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AssetPlacementDto {
    pub placement_id: String,
    pub rack_id: String,
    pub rack_code: String,
    pub area_id: String,
    pub area_name: String,
    pub room_id: String,
    pub room_name: String,
    pub start_u: i32,
    pub end_u: i32,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AssetDto {
    pub id: String,
    #[serde(rename = "type")]
    pub asset_type: String,
    pub name: String,
    pub hostname: Option<String>,
    pub intranet_ip: Option<String>,
    pub management_ip: Option<String>,
    pub serial_number: Option<String>,
    pub vendor: Option<String>,
    pub model: Option<String>,
    pub purpose: Option<String>,
    pub height_u: i32,
    pub status: String,
    pub notes: Option<String>,
    pub placement: Option<AssetPlacementDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PlacementDto {
    pub id: String,
    pub rack_id: String,
    pub asset_id: String,
    pub start_u: i32,
    pub end_u: i32,
    pub height_u: i32,
    pub placed_at: String,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RackPlacementViewDto {
    pub placement_id: String,
    pub asset_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub asset_type: String,
    pub status: String,
    pub hostname: Option<String>,
    pub intranet_ip: Option<String>,
    pub serial_number: Option<String>,
    pub vendor: Option<String>,
    pub model: Option<String>,
    pub purpose: Option<String>,
    pub start_u: i32,
    pub end_u: i32,
    pub height_u: i32,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RackCanvasDto {
    pub rack: RackDto,
    pub placements: Vec<RackPlacementViewDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RackViewDto {
    pub racks: Vec<RackCanvasDto>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SeedResultDto {
    pub seeded: bool,
    pub rooms: u32,
    pub areas: u32,
    pub racks: u32,
    pub assets: u32,
    pub placements: u32,
}
