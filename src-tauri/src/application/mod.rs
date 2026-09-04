use std::collections::{HashMap, HashSet};

use sqlx::{Row, SqlitePool};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};
use uuid::Uuid;

use crate::{
    domain,
    dto::{
        AreaDto, AssetDto, AssetPlacementDto, CreateAreaInput, CreateAssetInput, CreateRackInput,
        CreateRoomInput, LocationTreeDto, PlaceAssetInput, PlacementDto, RackCanvasDto, RackDto,
        RackPlacementViewDto, RackViewDto, ReorderRacksInput, ReorderRacksResultDto, RoomDto,
        RoomNodeDto,
    },
    error::AppErrorDto,
    infrastructure::repository,
};

#[cfg(debug_assertions)]
use crate::dto::SeedResultDto;

fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .expect("RFC 3339 formatting must succeed")
}

fn id() -> String {
    Uuid::now_v7().to_string()
}

fn room_dto(row: repository::RoomRow) -> RoomDto {
    RoomDto {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
    }
}

fn area_dto(row: repository::AreaRow) -> AreaDto {
    AreaDto {
        id: row.id,
        room_id: row.room_id,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
    }
}

fn rack_dto(row: repository::RackRow) -> RackDto {
    RackDto {
        id: row.id,
        area_id: row.area_id,
        area_name: row.area_name,
        room_id: row.room_id,
        room_name: row.room_name,
        code: row.code,
        specification: row.specification,
        total_u: row.total_u,
        power_capacity_w: row.power_capacity_w,
        status: row.status,
        notes: row.notes,
    }
}

fn asset_dto(row: repository::AssetRow) -> AssetDto {
    let placement = match (
        row.placement_id,
        row.rack_id,
        row.rack_code,
        row.area_id,
        row.area_name,
        row.room_id,
        row.room_name,
        row.start_u,
        row.placement_height_u,
    ) {
        (
            Some(placement_id),
            Some(rack_id),
            Some(rack_code),
            Some(area_id),
            Some(area_name),
            Some(room_id),
            Some(room_name),
            Some(start_u),
            Some(height_u),
        ) => Some(AssetPlacementDto {
            placement_id,
            rack_id,
            rack_code,
            area_id,
            area_name,
            room_id,
            room_name,
            start_u,
            end_u: start_u + height_u - 1,
        }),
        _ => None,
    };

    AssetDto {
        id: row.id,
        asset_type: row.asset_type,
        name: row.name,
        hostname: row.hostname,
        intranet_ip: row.intranet_ip,
        management_ip: row.management_ip,
        serial_number: row.serial_number,
        vendor: row.vendor,
        model: row.model,
        purpose: row.purpose,
        height_u: row.height_u,
        status: row.status,
        notes: row.notes,
        placement,
    }
}

pub async fn list_locations(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<LocationTreeDto, AppErrorDto> {
    let rooms = repository::list_rooms(pool)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let areas = repository::list_areas(pool)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let mut areas_by_room: HashMap<String, Vec<AreaDto>> = HashMap::new();
    for area in areas {
        areas_by_room
            .entry(area.room_id.clone())
            .or_default()
            .push(area_dto(area));
    }
    Ok(LocationTreeDto {
        rooms: rooms
            .into_iter()
            .map(|room| {
                let room_id = room.id.clone();
                RoomNodeDto {
                    room: room_dto(room),
                    areas: areas_by_room.remove(&room_id).unwrap_or_default(),
                }
            })
            .collect(),
    })
}

pub async fn create_room(
    pool: &SqlitePool,
    input: CreateRoomInput,
    operation_id: &str,
) -> Result<RoomDto, AppErrorDto> {
    let code = domain::required(&input.code, operation_id, "code")?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let description = domain::optional(input.description);
    let room_id = id();
    let timestamp = now();
    sqlx::query(
        "INSERT INTO rooms (id, code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
    )
    .bind(&room_id)
    .bind(&code)
    .bind(&name)
    .bind(&description)
    .bind(&timestamp)
    .bind(&timestamp)
    .execute(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(RoomDto {
        id: room_id,
        code,
        name,
        description,
        status: "active".into(),
    })
}

pub async fn create_area(
    pool: &SqlitePool,
    input: CreateAreaInput,
    operation_id: &str,
) -> Result<AreaDto, AppErrorDto> {
    let room_id = domain::required(&input.room_id, operation_id, "roomId")?;
    let code = domain::required(&input.code, operation_id, "code")?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let description = domain::optional(input.description);
    let parent_status = sqlx::query_scalar::<_, String>("SELECT status FROM rooms WHERE id = ?")
        .bind(&room_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if parent_status.as_deref() != Some("active") {
        return Err(AppErrorDto::validation(
            operation_id,
            "Area.RoomUnavailable",
            "所属机房不存在或不可用",
            "roomId",
        ));
    }
    let area_id = id();
    let timestamp = now();
    sqlx::query(
        "INSERT INTO areas (id, room_id, code, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
    )
    .bind(&area_id)
    .bind(&room_id)
    .bind(&code)
    .bind(&name)
    .bind(&description)
    .bind(&timestamp)
    .bind(&timestamp)
    .execute(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(AreaDto {
        id: area_id,
        room_id,
        code,
        name,
        description,
        status: "active".into(),
    })
}

pub async fn list_racks(
    pool: &SqlitePool,
    area_id: Option<String>,
    operation_id: &str,
) -> Result<Vec<RackDto>, AppErrorDto> {
    repository::list_racks(pool, area_id.as_deref())
        .await
        .map(|rows| rows.into_iter().map(rack_dto).collect())
        .map_err(|error| AppErrorDto::database(operation_id, error))
}

pub async fn create_rack(
    pool: &SqlitePool,
    input: CreateRackInput,
    operation_id: &str,
) -> Result<RackDto, AppErrorDto> {
    let area_id = domain::required(&input.area_id, operation_id, "areaId")?;
    let code = domain::required(&input.code, operation_id, "code")?;
    let specification = domain::required(&input.specification, operation_id, "specification")?;
    domain::validate_rack(
        &specification,
        input.total_u,
        input.power_capacity_w,
        operation_id,
    )?;
    let parent = sqlx::query(
        "SELECT area.status AS area_status, area.name AS area_name, room.id AS room_id, room.name AS room_name, room.status AS room_status FROM areas area JOIN rooms room ON room.id = area.room_id WHERE area.id = ?",
    )
    .bind(&area_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let Some(parent) = parent else {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.AreaUnavailable",
            "所属区域不存在",
            "areaId",
        ));
    };
    if parent.get::<String, _>("area_status") != "active"
        || parent.get::<String, _>("room_status") != "active"
    {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.AreaUnavailable",
            "所属区域或机房不可用",
            "areaId",
        ));
    }
    let rack_id = id();
    let timestamp = now();
    let notes = domain::optional(input.notes);
    let sort_order: i64 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM racks WHERE status = 'active'",
    )
    .fetch_one(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    sqlx::query(
        "INSERT INTO racks (id, area_id, code, specification, total_u, power_capacity_w, status, notes, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)",
    )
    .bind(&rack_id)
    .bind(&area_id)
    .bind(&code)
    .bind(&specification)
    .bind(input.total_u)
    .bind(input.power_capacity_w)
    .bind(&notes)
    .bind(&timestamp)
    .bind(&timestamp)
    .bind(sort_order)
    .execute(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(RackDto {
        id: rack_id,
        area_id,
        area_name: parent.get("area_name"),
        room_id: parent.get("room_id"),
        room_name: parent.get("room_name"),
        code,
        specification,
        total_u: input.total_u,
        power_capacity_w: input.power_capacity_w,
        status: "active".into(),
        notes,
    })
}

pub async fn list_assets(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<Vec<AssetDto>, AppErrorDto> {
    repository::list_assets(pool)
        .await
        .map(|rows| rows.into_iter().map(asset_dto).collect())
        .map_err(|error| AppErrorDto::database(operation_id, error))
}

pub async fn create_asset(
    pool: &SqlitePool,
    input: CreateAssetInput,
    operation_id: &str,
) -> Result<AssetDto, AppErrorDto> {
    domain::validate_asset(&input, operation_id)?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let asset_id = id();
    let timestamp = now();
    let hostname = domain::optional(input.hostname);
    let intranet_ip = domain::optional(input.intranet_ip);
    let management_ip = domain::optional(input.management_ip);
    let serial_number = domain::optional(input.serial_number);
    let vendor = domain::optional(input.vendor);
    let model = domain::optional(input.model);
    let purpose = domain::optional(input.purpose);
    let notes = domain::optional(input.notes);
    sqlx::query(
        r#"
        INSERT INTO assets (
            id, type, name, hostname, intranet_ip, management_ip, serial_number,
            vendor, model, purpose, height_u, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&asset_id)
    .bind(&input.asset_type)
    .bind(&name)
    .bind(&hostname)
    .bind(&intranet_ip)
    .bind(&management_ip)
    .bind(&serial_number)
    .bind(&vendor)
    .bind(&model)
    .bind(&purpose)
    .bind(input.height_u)
    .bind(&input.status)
    .bind(&notes)
    .bind(&timestamp)
    .bind(&timestamp)
    .execute(pool)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(AssetDto {
        id: asset_id,
        asset_type: input.asset_type,
        name,
        hostname,
        intranet_ip,
        management_ip,
        serial_number,
        vendor,
        model,
        purpose,
        height_u: input.height_u,
        status: input.status,
        notes,
        placement: None,
    })
}

pub async fn place_asset(
    pool: &SqlitePool,
    input: PlaceAssetInput,
    operation_id: &str,
) -> Result<PlacementDto, AppErrorDto> {
    let asset_id = domain::required(&input.asset_id, operation_id, "assetId")?;
    let rack_id = domain::required(&input.rack_id, operation_id, "rackId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let asset = repository::find_asset_for_placement(&mut *transaction, &asset_id)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?
        .ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Placement.AssetUnavailable",
                "设备不存在或不可用",
                "assetId",
            )
        })?;
    if asset.status == "archived" {
        return Err(AppErrorDto::validation(
            operation_id,
            "Placement.AssetUnavailable",
            "已归档设备不能上架",
            "assetId",
        ));
    }
    let rack = repository::find_rack_for_placement(&mut *transaction, &rack_id)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?
        .ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Placement.RackUnavailable",
                "机柜不存在或不可用",
                "rackId",
            )
        })?;
    if rack.status != "active" {
        return Err(AppErrorDto::validation(
            operation_id,
            "Placement.RackUnavailable",
            "机柜不可用",
            "rackId",
        ));
    }
    let (_, end_u) = domain::placement_range(
        input.start_u,
        asset.height_u,
        rack.total_u,
        &rack_id,
        operation_id,
    )?;
    let existing: Option<String> = sqlx::query_scalar(
        "SELECT id FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL LIMIT 1",
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if existing.is_some() {
        return Err(AppErrorDto::validation(
            operation_id,
            "Placement.AssetAlreadyPlaced",
            "设备已经上架",
            "assetId",
        ));
    }
    let conflict: Option<String> = sqlx::query_scalar(
        r#"
        SELECT asset_id FROM rack_placements
        WHERE rack_id = ? AND removed_at IS NULL
          AND start_u <= ? AND start_u + height_u - 1 >= ?
        LIMIT 1
        "#,
    )
    .bind(&rack_id)
    .bind(end_u)
    .bind(input.start_u)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if let Some(conflicting_asset_id) = conflict {
        return Err(AppErrorDto::placement(
            operation_id,
            "Placement.Overlap",
            "目标 U 位已被占用",
            &rack_id,
            input.start_u,
            end_u,
            Some(conflicting_asset_id),
        ));
    }
    let placement_id = id();
    let placed_at = now();
    sqlx::query(
        "INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    )
    .bind(&placement_id)
    .bind(&rack_id)
    .bind(&asset_id)
    .bind(input.start_u)
    .bind(asset.height_u)
    .bind(&placed_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(PlacementDto {
        id: placement_id,
        rack_id,
        asset_id,
        start_u: input.start_u,
        end_u,
        height_u: asset.height_u,
        placed_at,
    })
}

pub async fn get_rack_view(
    pool: &SqlitePool,
    area_id: Option<String>,
    operation_id: &str,
) -> Result<RackViewDto, AppErrorDto> {
    let rows = repository::rack_view(pool, area_id.as_deref())
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let mut rack_indexes: HashMap<String, usize> = HashMap::new();
    let mut racks: Vec<RackCanvasDto> = Vec::new();
    for row in rows {
        let index = if let Some(index) = rack_indexes.get(&row.rack_id) {
            *index
        } else {
            let index = racks.len();
            rack_indexes.insert(row.rack_id.clone(), index);
            racks.push(RackCanvasDto {
                rack: RackDto {
                    id: row.rack_id.clone(),
                    area_id: row.area_id.clone(),
                    area_name: row.area_name.clone(),
                    room_id: row.room_id.clone(),
                    room_name: row.room_name.clone(),
                    code: row.rack_code.clone(),
                    specification: row.specification.clone(),
                    total_u: row.total_u,
                    power_capacity_w: row.power_capacity_w,
                    status: row.rack_status.clone(),
                    notes: row.rack_notes.clone(),
                },
                placements: Vec::new(),
            });
            index
        };
        if let (
            Some(placement_id),
            Some(asset_id),
            Some(name),
            Some(asset_type),
            Some(status),
            Some(start_u),
            Some(height_u),
        ) = (
            row.placement_id,
            row.asset_id,
            row.asset_name,
            row.asset_type,
            row.asset_status,
            row.start_u,
            row.height_u,
        ) {
            racks[index].placements.push(RackPlacementViewDto {
                placement_id,
                asset_id,
                name,
                asset_type,
                status,
                hostname: row.hostname,
                intranet_ip: row.intranet_ip,
                serial_number: row.serial_number,
                vendor: row.vendor,
                model: row.model,
                purpose: row.purpose,
                start_u,
                end_u: start_u + height_u - 1,
                height_u,
            });
        }
    }
    Ok(RackViewDto { racks })
}

pub async fn reorder_racks(
    pool: &SqlitePool,
    input: ReorderRacksInput,
    operation_id: &str,
) -> Result<ReorderRacksResultDto, AppErrorDto> {
    if input.rack_ids.is_empty() {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.OrderEmpty",
            "机柜顺序不能为空",
            "rackIds",
        ));
    }
    let requested: HashSet<&str> = input.rack_ids.iter().map(String::as_str).collect();
    if requested.len() != input.rack_ids.len() {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.OrderDuplicate",
            "机柜顺序中包含重复项",
            "rackIds",
        ));
    }

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let current_order = repository::list_active_rack_ids(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let active_ids: HashSet<&str> = current_order.iter().map(String::as_str).collect();
    if input
        .rack_ids
        .iter()
        .any(|rack_id| !active_ids.contains(rack_id.as_str()))
    {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.OrderUnavailable",
            "机柜顺序中包含不存在或不可用的机柜",
            "rackIds",
        ));
    }

    let mut requested_order = input.rack_ids.iter();
    let final_order: Vec<String> = current_order
        .iter()
        .map(|rack_id| {
            if requested.contains(rack_id.as_str()) {
                requested_order
                    .next()
                    .expect("requested rack slots and ids must have equal lengths")
                    .clone()
            } else {
                rack_id.clone()
            }
        })
        .collect();
    let timestamp = now();
    for (position, rack_id) in final_order.iter().enumerate() {
        sqlx::query("UPDATE racks SET sort_order = ? WHERE id = ?")
            .bind(position as i64)
            .bind(rack_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    for rack_id in &input.rack_ids {
        sqlx::query("UPDATE racks SET updated_at = ? WHERE id = ?")
            .bind(&timestamp)
            .bind(rack_id)
            .execute(&mut *transaction)
            .await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;

    Ok(ReorderRacksResultDto {
        rack_ids: input.rack_ids,
    })
}

#[cfg(debug_assertions)]
pub async fn seed_dev_data(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<SeedResultDto, AppErrorDto> {
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let row_count = repository::core_row_count(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if row_count > 0 {
        let fixture_exists: i32 =
            sqlx::query_scalar("SELECT COUNT(*) FROM rooms WHERE code = 'DEV-LAB'")
                .fetch_one(&mut *transaction)
                .await
                .map_err(|error| AppErrorDto::database(operation_id, error))?;
        if fixture_exists > 0 {
            return Ok(SeedResultDto {
                seeded: false,
                rooms: 0,
                areas: 0,
                racks: 0,
                assets: 0,
                placements: 0,
            });
        }
        return Err(AppErrorDto::simple(
            operation_id,
            "DevData.NotEmpty",
            "当前数据库已有业务数据，不能加载开发样例",
        ));
    }

    let timestamp = now();
    let room_id = id();
    let area_id = id();
    sqlx::query("INSERT INTO rooms (id, code, name, description, status, created_at, updated_at) VALUES (?, 'DEV-LAB', '研发实验室', '仅用于调试构建的样例机房', 'active', ?, ?)")
        .bind(&room_id).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    sqlx::query("INSERT INTO areas (id, room_id, code, name, description, status, created_at, updated_at) VALUES (?, ?, 'A', 'A 区', NULL, 'active', ?, ?)")
        .bind(&area_id).bind(&room_id).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;

    let racks = [
        (id(), "A-01", "42U", 42_i32),
        (id(), "A-02", "27U", 27_i32),
        (id(), "EDGE-01", "18U", 18_i32),
    ];
    for (sort_order, (rack_id, code, specification, total_u)) in racks.iter().enumerate() {
        sqlx::query("INSERT INTO racks (id, area_id, code, specification, total_u, power_capacity_w, status, notes, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, NULL, 'active', NULL, ?, ?, ?)")
            .bind(rack_id).bind(&area_id).bind(code).bind(specification).bind(total_u).bind(&timestamp).bind(&timestamp).bind(sort_order as i64).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }

    let assets = [
        (
            id(),
            "server",
            "计算节点 01",
            Some("compute-01"),
            Some("10.20.0.11"),
            2_i32,
            "active",
        ),
        (
            id(),
            "switch",
            "核心交换机",
            Some("switch-core"),
            Some("10.20.0.2"),
            1_i32,
            "active",
        ),
        (
            id(),
            "router",
            "边界路由器",
            Some("router-edge"),
            Some("10.20.0.1"),
            1_i32,
            "active",
        ),
        (
            id(),
            "firewall",
            "出口防火墙",
            Some("firewall-01"),
            Some("10.20.0.3"),
            1_i32,
            "maintenance",
        ),
        (
            id(),
            "server",
            "待上架服务器",
            Some("server-pending"),
            None,
            2_i32,
            "offline",
        ),
    ];
    for (asset_id, asset_type, name, hostname, intranet_ip, height_u, status) in &assets {
        sqlx::query("INSERT INTO assets (id, type, name, hostname, intranet_ip, management_ip, serial_number, vendor, model, purpose, height_u, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, ?, ?)")
            .bind(asset_id).bind(asset_type).bind(name).bind(hostname).bind(intranet_ip).bind(height_u).bind(status).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    for (asset_index, rack_index, start_u) in
        [(0_usize, 0_usize, 4_i32), (1, 0, 10), (2, 1, 5), (3, 2, 2)]
    {
        sqlx::query("INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, NULL)")
            .bind(id()).bind(&racks[rack_index].0).bind(&assets[asset_index].0).bind(start_u).bind(assets[asset_index].5).bind(&timestamp).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(SeedResultDto {
        seeded: true,
        rooms: 1,
        areas: 1,
        racks: 3,
        assets: 5,
        placements: 4,
    })
}

#[cfg(test)]
mod tests {
    use crate::{
        dto::{
            CreateAreaInput, CreateAssetInput, CreateRackInput, CreateRoomInput, PlaceAssetInput,
            ReorderRacksInput,
        },
        state::AppState,
    };

    use super::{
        create_area, create_asset, create_rack, create_room, get_rack_view, place_asset,
        reorder_racks, seed_dev_data,
    };

    async fn fixture() -> AppState {
        AppState::test().await.unwrap()
    }

    #[tokio::test]
    async fn creates_complete_flow_and_returns_rack_view() {
        let state = fixture().await;
        let room = create_room(
            &state.pool,
            CreateRoomInput {
                code: "DC".into(),
                name: "机房".into(),
                description: None,
            },
            "op",
        )
        .await
        .unwrap();
        let area = create_area(
            &state.pool,
            CreateAreaInput {
                room_id: room.id,
                code: "A".into(),
                name: "A 区".into(),
                description: None,
            },
            "op",
        )
        .await
        .unwrap();
        let rack = create_rack(
            &state.pool,
            CreateRackInput {
                area_id: area.id,
                code: "A-01".into(),
                specification: "42U".into(),
                total_u: 42,
                power_capacity_w: None,
                notes: None,
            },
            "op",
        )
        .await
        .unwrap();
        let asset = create_asset(
            &state.pool,
            CreateAssetInput {
                asset_type: "server".into(),
                name: "srv-01".into(),
                hostname: None,
                intranet_ip: None,
                management_ip: None,
                serial_number: None,
                vendor: None,
                model: None,
                purpose: None,
                height_u: 2,
                status: "active".into(),
                notes: None,
            },
            "op",
        )
        .await
        .unwrap();
        place_asset(
            &state.pool,
            PlaceAssetInput {
                asset_id: asset.id,
                rack_id: rack.id.clone(),
                start_u: 41,
            },
            "op",
        )
        .await
        .unwrap();
        let view = get_rack_view(&state.pool, Some(rack.area_id), "op")
            .await
            .unwrap();
        assert_eq!(view.racks.len(), 1);
        assert_eq!(view.racks[0].placements[0].end_u, 42);
    }

    #[tokio::test]
    async fn rejects_overlap_and_preserves_existing_placement() {
        let state = fixture().await;
        let room = create_room(
            &state.pool,
            CreateRoomInput {
                code: "DC".into(),
                name: "机房".into(),
                description: None,
            },
            "op",
        )
        .await
        .unwrap();
        let area = create_area(
            &state.pool,
            CreateAreaInput {
                room_id: room.id,
                code: "A".into(),
                name: "A 区".into(),
                description: None,
            },
            "op",
        )
        .await
        .unwrap();
        let rack = create_rack(
            &state.pool,
            CreateRackInput {
                area_id: area.id,
                code: "A-01".into(),
                specification: "18U".into(),
                total_u: 18,
                power_capacity_w: None,
                notes: None,
            },
            "op",
        )
        .await
        .unwrap();
        let make_asset = |name: &str| CreateAssetInput {
            asset_type: "server".into(),
            name: name.into(),
            hostname: None,
            intranet_ip: None,
            management_ip: None,
            serial_number: None,
            vendor: None,
            model: None,
            purpose: None,
            height_u: 2,
            status: "active".into(),
            notes: None,
        };
        let first = create_asset(&state.pool, make_asset("first"), "op")
            .await
            .unwrap();
        let second = create_asset(&state.pool, make_asset("second"), "op")
            .await
            .unwrap();
        place_asset(
            &state.pool,
            PlaceAssetInput {
                asset_id: first.id,
                rack_id: rack.id.clone(),
                start_u: 4,
            },
            "op",
        )
        .await
        .unwrap();
        let error = place_asset(
            &state.pool,
            PlaceAssetInput {
                asset_id: second.id,
                rack_id: rack.id,
                start_u: 5,
            },
            "op",
        )
        .await
        .unwrap_err();
        assert_eq!(error.code, "Placement.Overlap");
        let count: i32 =
            sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements WHERE removed_at IS NULL")
                .fetch_one(&state.pool)
                .await
                .unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn development_seed_is_manual_and_idempotent() {
        let state = fixture().await;
        let first = seed_dev_data(&state.pool, "op").await.unwrap();
        assert!(first.seeded);
        assert_eq!(first.racks, 3);
        assert_eq!(first.assets, 5);

        let second = seed_dev_data(&state.pool, "op").await.unwrap();
        assert!(!second.seeded);
        let view = get_rack_view(&state.pool, None, "op").await.unwrap();
        assert_eq!(view.racks.len(), 3);
        assert_eq!(
            view.racks
                .iter()
                .map(|rack| rack.placements.len())
                .sum::<usize>(),
            4
        );
    }

    #[tokio::test]
    async fn reorders_visible_racks_and_preserves_hidden_slots() {
        let state = fixture().await;
        seed_dev_data(&state.pool, "op").await.unwrap();
        let before = get_rack_view(&state.pool, None, "op").await.unwrap();
        let ids: Vec<String> = before
            .racks
            .iter()
            .map(|rack| rack.rack.id.clone())
            .collect();
        sqlx::query("UPDATE racks SET sort_order = 100 WHERE id = ?")
            .bind(&ids[1])
            .execute(&state.pool)
            .await
            .unwrap();
        sqlx::query("UPDATE racks SET sort_order = 101 WHERE id = ?")
            .bind(&ids[2])
            .execute(&state.pool)
            .await
            .unwrap();

        reorder_racks(
            &state.pool,
            ReorderRacksInput {
                rack_ids: vec![ids[2].clone(), ids[0].clone()],
            },
            "op",
        )
        .await
        .unwrap();

        let after = get_rack_view(&state.pool, None, "op").await.unwrap();
        let reordered: Vec<String> = after
            .racks
            .iter()
            .map(|rack| rack.rack.id.clone())
            .collect();
        assert_eq!(
            reordered,
            vec![ids[2].clone(), ids[1].clone(), ids[0].clone()]
        );
    }

    #[tokio::test]
    async fn rejects_duplicate_rack_order_without_changing_data() {
        let state = fixture().await;
        seed_dev_data(&state.pool, "op").await.unwrap();
        let before = get_rack_view(&state.pool, None, "op").await.unwrap();
        let first_id = before.racks[0].rack.id.clone();

        let error = reorder_racks(
            &state.pool,
            ReorderRacksInput {
                rack_ids: vec![first_id.clone(), first_id],
            },
            "op",
        )
        .await
        .unwrap_err();
        assert_eq!(error.code, "Rack.OrderDuplicate");

        let after = get_rack_view(&state.pool, None, "op").await.unwrap();
        assert_eq!(
            before
                .racks
                .iter()
                .map(|rack| &rack.rack.id)
                .collect::<Vec<_>>(),
            after
                .racks
                .iter()
                .map(|rack| &rack.rack.id)
                .collect::<Vec<_>>()
        );
    }
}
