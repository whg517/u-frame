use sqlx::{FromRow, Sqlite, SqliteExecutor};

#[derive(Clone, Debug, FromRow)]
pub struct RoomRow {
    pub id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, FromRow)]
pub struct AreaRow {
    pub id: String,
    pub room_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Clone, Debug, FromRow)]
pub struct RackRow {
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

#[derive(Clone, Debug, FromRow)]
pub struct AssetRow {
    pub id: String,
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
    pub placement_id: Option<String>,
    pub rack_id: Option<String>,
    pub rack_code: Option<String>,
    pub area_id: Option<String>,
    pub area_name: Option<String>,
    pub room_id: Option<String>,
    pub room_name: Option<String>,
    pub start_u: Option<i32>,
    pub placement_height_u: Option<i32>,
}

#[derive(Clone, Debug, FromRow)]
pub struct RackViewRow {
    pub rack_id: String,
    pub area_id: String,
    pub area_name: String,
    pub room_id: String,
    pub room_name: String,
    pub rack_code: String,
    pub specification: String,
    pub total_u: i32,
    pub power_capacity_w: Option<i32>,
    pub rack_status: String,
    pub rack_notes: Option<String>,
    pub placement_id: Option<String>,
    pub asset_id: Option<String>,
    pub asset_name: Option<String>,
    pub asset_type: Option<String>,
    pub asset_status: Option<String>,
    pub hostname: Option<String>,
    pub intranet_ip: Option<String>,
    pub serial_number: Option<String>,
    pub vendor: Option<String>,
    pub model: Option<String>,
    pub purpose: Option<String>,
    pub start_u: Option<i32>,
    pub height_u: Option<i32>,
}

#[derive(Clone, Debug, FromRow)]
pub struct PlacementAssetRow {
    pub id: String,
    pub height_u: i32,
    pub status: String,
}

#[derive(Clone, Debug, FromRow)]
pub struct PlacementRackRow {
    pub id: String,
    pub total_u: i32,
    pub status: String,
}

pub async fn list_rooms<'e, E>(executor: E) -> Result<Vec<RoomRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, RoomRow>(
        "SELECT id, code, name, description, status FROM rooms WHERE status = 'active' ORDER BY code",
    )
    .fetch_all(executor)
    .await
}

pub async fn list_areas<'e, E>(executor: E) -> Result<Vec<AreaRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, AreaRow>(
        "SELECT id, room_id, code, name, description, status FROM areas WHERE status = 'active' ORDER BY code",
    )
    .fetch_all(executor)
    .await
}

pub async fn list_racks<'e, E>(
    executor: E,
    area_id: Option<&str>,
) -> Result<Vec<RackRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, RackRow>(
        r#"
        SELECT r.id, r.area_id, a.name AS area_name, room.id AS room_id, room.name AS room_name,
               r.code, r.specification, r.total_u, r.power_capacity_w, r.status, r.notes
        FROM racks r
        JOIN areas a ON a.id = r.area_id
        JOIN rooms room ON room.id = a.room_id
        WHERE r.status = 'active' AND (?1 IS NULL OR r.area_id = ?1)
        ORDER BY room.code, a.code, r.code
        "#,
    )
    .bind(area_id)
    .fetch_all(executor)
    .await
}

pub async fn list_assets<'e, E>(executor: E) -> Result<Vec<AssetRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, AssetRow>(
        r#"
        SELECT asset.id, asset.type AS asset_type, asset.name, asset.hostname, asset.intranet_ip,
               asset.management_ip, asset.serial_number, asset.vendor, asset.model, asset.purpose,
               asset.height_u, asset.status, asset.notes,
               p.id AS placement_id, rack.id AS rack_id, rack.code AS rack_code,
               area.id AS area_id, area.name AS area_name, room.id AS room_id, room.name AS room_name,
               p.start_u, p.height_u AS placement_height_u
        FROM assets asset
        LEFT JOIN rack_placements p ON p.asset_id = asset.id AND p.removed_at IS NULL
        LEFT JOIN racks rack ON rack.id = p.rack_id
        LEFT JOIN areas area ON area.id = rack.area_id
        LEFT JOIN rooms room ON room.id = area.room_id
        WHERE asset.status != 'archived'
        ORDER BY asset.name, asset.id
        "#,
    )
    .fetch_all(executor)
    .await
}

pub async fn rack_view<'e, E>(
    executor: E,
    area_id: Option<&str>,
) -> Result<Vec<RackViewRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, RackViewRow>(
        r#"
        SELECT rack.id AS rack_id, area.id AS area_id, area.name AS area_name,
               room.id AS room_id, room.name AS room_name, rack.code AS rack_code,
               rack.specification, rack.total_u, rack.power_capacity_w,
               rack.status AS rack_status, rack.notes AS rack_notes,
               p.id AS placement_id, asset.id AS asset_id, asset.name AS asset_name,
               asset.type AS asset_type, asset.status AS asset_status, asset.hostname,
               asset.intranet_ip, asset.serial_number, asset.vendor, asset.model, asset.purpose,
               p.start_u, p.height_u
        FROM racks rack
        JOIN areas area ON area.id = rack.area_id
        JOIN rooms room ON room.id = area.room_id
        LEFT JOIN rack_placements p ON p.rack_id = rack.id AND p.removed_at IS NULL
        LEFT JOIN assets asset ON asset.id = p.asset_id
        WHERE rack.status = 'active' AND (?1 IS NULL OR rack.area_id = ?1)
        ORDER BY room.code, area.code, rack.code, p.start_u DESC
        "#,
    )
    .bind(area_id)
    .fetch_all(executor)
    .await
}

pub async fn find_asset_for_placement<'e, E>(
    executor: E,
    asset_id: &str,
) -> Result<Option<PlacementAssetRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, PlacementAssetRow>("SELECT id, height_u, status FROM assets WHERE id = ?")
        .bind(asset_id)
        .fetch_optional(executor)
        .await
}

pub async fn find_rack_for_placement<'e, E>(
    executor: E,
    rack_id: &str,
) -> Result<Option<PlacementRackRow>, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_as::<_, PlacementRackRow>("SELECT id, total_u, status FROM racks WHERE id = ?")
        .bind(rack_id)
        .fetch_optional(executor)
        .await
}

pub async fn core_row_count<'e, E>(executor: E) -> Result<i32, sqlx::Error>
where
    E: SqliteExecutor<'e>,
{
    sqlx::query_scalar::<Sqlite, i32>(
        "SELECT (SELECT COUNT(*) FROM rooms) + (SELECT COUNT(*) FROM areas) + (SELECT COUNT(*) FROM racks) + (SELECT COUNT(*) FROM assets) + (SELECT COUNT(*) FROM rack_placements)",
    )
    .fetch_one(executor)
    .await
}
