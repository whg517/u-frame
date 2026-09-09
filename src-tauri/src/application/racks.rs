use std::collections::HashSet;

use sqlx::{Row, SqlitePool};

use crate::{
    domain,
    dto::{CreateRackInput, RackDto, ReorderRacksInput, ReorderRacksResultDto, UpdateRackInput},
    error::AppErrorDto,
    infrastructure::repository,
};

use super::{id, now, rack_dto};

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

pub async fn update_rack(
    pool: &SqlitePool,
    input: UpdateRackInput,
    operation_id: &str,
) -> Result<RackDto, AppErrorDto> {
    let rack_id = domain::required(&input.rack_id, operation_id, "rackId")?;
    let area_id = domain::required(&input.area_id, operation_id, "areaId")?;
    let code = domain::required(&input.code, operation_id, "code")?;
    let specification = domain::required(&input.specification, operation_id, "specification")?;
    domain::validate_rack(
        &specification,
        input.total_u,
        input.power_capacity_w,
        operation_id,
    )?;
    let notes = domain::optional(input.notes);
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let parent = sqlx::query(
        "SELECT area.status AS area_status, area.name AS area_name, room.id AS room_id, room.name AS room_name, room.status AS room_status FROM areas area JOIN rooms room ON room.id = area.room_id WHERE area.id = ?",
    )
    .bind(&area_id)
    .fetch_optional(&mut *transaction)
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
    let highest_end_u: Option<i32> = sqlx::query_scalar(
        "SELECT MAX(start_u + height_u - 1) FROM rack_placements WHERE rack_id = ? AND removed_at IS NULL",
    )
    .bind(&rack_id)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if highest_end_u.is_some_and(|end_u| end_u > input.total_u) {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.HeightOccupied",
            "机柜缩容会使现有设备超出 U 位范围",
            "totalU",
        ));
    }
    let timestamp = now();
    let result = sqlx::query(
        "UPDATE racks SET area_id = ?, code = ?, specification = ?, total_u = ?, power_capacity_w = ?, notes = ?, updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .bind(&area_id)
    .bind(&code)
    .bind(&specification)
    .bind(input.total_u)
    .bind(input.power_capacity_w)
    .bind(&notes)
    .bind(&timestamp)
    .bind(&rack_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if result.rows_affected() == 0 {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.NotFound",
            "机柜不存在或不可用",
            "rackId",
        ));
    }
    transaction
        .commit()
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
