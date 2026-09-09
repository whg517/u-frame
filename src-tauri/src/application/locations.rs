use crate::infrastructure::database_error::database_error;
use std::collections::HashMap;

use sqlx::SqlitePool;

use crate::{
    application::validation as domain,
    dto::{
        AreaDto, CreateAreaInput, CreateRoomInput, LocationTreeDto, RoomDto, RoomNodeDto,
        UpdateAreaInput, UpdateRoomInput,
    },
    error::AppErrorDto,
    infrastructure::repository,
};

use super::{area_dto, id, now, room_dto};

pub async fn list_locations(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<LocationTreeDto, AppErrorDto> {
    let rooms = repository::list_rooms(pool)
        .await
        .map_err(|error| database_error(operation_id, error))?;
    let areas = repository::list_areas(pool)
        .await
        .map_err(|error| database_error(operation_id, error))?;
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
    .map_err(|error| database_error(operation_id, error))?;
    Ok(RoomDto {
        id: room_id,
        code,
        name,
        description,
        status: "active".into(),
    })
}

pub async fn update_room(
    pool: &SqlitePool,
    input: UpdateRoomInput,
    operation_id: &str,
) -> Result<RoomDto, AppErrorDto> {
    let room_id = domain::required(&input.room_id, operation_id, "roomId")?;
    let code = domain::required(&input.code, operation_id, "code")?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let description = domain::optional(input.description);
    let timestamp = now();
    let result = sqlx::query(
        "UPDATE rooms SET code = ?, name = ?, description = ?, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .bind(&code)
    .bind(&name)
    .bind(&description)
    .bind(&timestamp)
    .bind(&room_id)
    .execute(pool)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    if result.rows_affected() == 0 {
        return Err(AppErrorDto::validation(
            operation_id,
            "Room.NotFound",
            "机房不存在或不可用",
            "roomId",
        ));
    }
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
        .map_err(|error| database_error(operation_id, error))?;
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
    .map_err(|error| database_error(operation_id, error))?;
    Ok(AreaDto {
        id: area_id,
        room_id,
        code,
        name,
        description,
        status: "active".into(),
    })
}

pub async fn update_area(
    pool: &SqlitePool,
    input: UpdateAreaInput,
    operation_id: &str,
) -> Result<AreaDto, AppErrorDto> {
    let area_id = domain::required(&input.area_id, operation_id, "areaId")?;
    let room_id = domain::required(&input.room_id, operation_id, "roomId")?;
    let code = domain::required(&input.code, operation_id, "code")?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let description = domain::optional(input.description);
    let parent_status = sqlx::query_scalar::<_, String>("SELECT status FROM rooms WHERE id = ?")
        .bind(&room_id)
        .fetch_optional(pool)
        .await
        .map_err(|error| database_error(operation_id, error))?;
    if parent_status.as_deref() != Some("active") {
        return Err(AppErrorDto::validation(
            operation_id,
            "Area.RoomUnavailable",
            "所属机房不存在或不可用",
            "roomId",
        ));
    }
    let timestamp = now();
    let result = sqlx::query(
        "UPDATE areas SET room_id = ?, code = ?, name = ?, description = ?, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .bind(&room_id)
    .bind(&code)
    .bind(&name)
    .bind(&description)
    .bind(&timestamp)
    .bind(&area_id)
    .execute(pool)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    if result.rows_affected() == 0 {
        return Err(AppErrorDto::validation(
            operation_id,
            "Area.NotFound",
            "区域不存在或不可用",
            "areaId",
        ));
    }
    Ok(AreaDto {
        id: area_id,
        room_id,
        code,
        name,
        description,
        status: "active".into(),
    })
}
