use crate::infrastructure::database_error::database_error;
use sqlx::{Row, SqlitePool};

use crate::{
    application::validation as domain,
    dto::{
        MoveAssetInput, PlaceAssetInput, PlacementDto, UnplaceAssetInput, UnplaceAssetResultDto,
    },
    error::AppErrorDto,
    infrastructure::repository,
};

use super::{id, now};

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
        .map_err(|error| database_error(operation_id, error))?;
    let asset = repository::find_asset_for_placement(&mut *transaction, &asset_id)
        .await
        .map_err(|error| database_error(operation_id, error))?
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
        .map_err(|error| database_error(operation_id, error))?
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
    .map_err(|error| database_error(operation_id, error))?;
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
    .map_err(|error| database_error(operation_id, error))?;
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
    .map_err(|error| database_error(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| database_error(operation_id, error))?;
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

pub async fn move_asset(
    pool: &SqlitePool,
    input: MoveAssetInput,
    operation_id: &str,
) -> Result<PlacementDto, AppErrorDto> {
    let asset_id = domain::required(&input.asset_id, operation_id, "assetId")?;
    let rack_id = domain::required(&input.rack_id, operation_id, "rackId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    let asset = repository::find_asset_for_placement(&mut *transaction, &asset_id)
        .await
        .map_err(|error| database_error(operation_id, error))?
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
            "已归档设备不能移动",
            "assetId",
        ));
    }
    let rack = repository::find_rack_for_placement(&mut *transaction, &rack_id)
        .await
        .map_err(|error| database_error(operation_id, error))?
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
    let current = sqlx::query(
        "SELECT id, rack_id, start_u FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL LIMIT 1",
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    let current = current.ok_or_else(|| {
        AppErrorDto::validation(
            operation_id,
            "Placement.AssetNotPlaced",
            "设备尚未上架",
            "assetId",
        )
    })?;
    let current_id: String = current.get("id");
    let current_rack_id: String = current.get("rack_id");
    let current_start_u: i32 = current.get("start_u");
    if current_rack_id == rack_id && current_start_u == input.start_u {
        return Err(AppErrorDto::validation(
            operation_id,
            "Placement.Unchanged",
            "请选择不同的机柜或 U 位",
            "startU",
        ));
    }
    let conflict: Option<String> = sqlx::query_scalar(
        r#"
        SELECT asset_id FROM rack_placements
        WHERE rack_id = ? AND removed_at IS NULL AND id != ?
          AND start_u <= ? AND start_u + height_u - 1 >= ?
        LIMIT 1
        "#,
    )
    .bind(&rack_id)
    .bind(&current_id)
    .bind(end_u)
    .bind(input.start_u)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
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
    let changed_at = now();
    sqlx::query("UPDATE rack_placements SET removed_at = ? WHERE id = ? AND removed_at IS NULL")
        .bind(&changed_at)
        .bind(&current_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| database_error(operation_id, error))?;
    let placement_id = id();
    sqlx::query(
        "INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
    )
    .bind(&placement_id)
    .bind(&rack_id)
    .bind(&asset_id)
    .bind(input.start_u)
    .bind(asset.height_u)
    .bind(&changed_at)
    .execute(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    Ok(PlacementDto {
        id: placement_id,
        rack_id,
        asset_id,
        start_u: input.start_u,
        end_u,
        height_u: asset.height_u,
        placed_at: changed_at,
    })
}

pub async fn unplace_asset(
    pool: &SqlitePool,
    input: UnplaceAssetInput,
    operation_id: &str,
) -> Result<UnplaceAssetResultDto, AppErrorDto> {
    let asset_id = domain::required(&input.asset_id, operation_id, "assetId")?;
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    let placement_id: Option<String> = sqlx::query_scalar(
        "SELECT id FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL LIMIT 1",
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    let placement_id = placement_id.ok_or_else(|| {
        AppErrorDto::validation(
            operation_id,
            "Placement.AssetNotPlaced",
            "设备尚未上架",
            "assetId",
        )
    })?;
    let removed_at = now();
    sqlx::query("UPDATE rack_placements SET removed_at = ? WHERE id = ? AND removed_at IS NULL")
        .bind(&removed_at)
        .bind(&placement_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| database_error(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    Ok(UnplaceAssetResultDto {
        asset_id,
        placement_id,
        removed_at,
    })
}
