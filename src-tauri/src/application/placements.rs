use std::collections::{HashMap, HashSet};

use sqlx::{Row, SqlitePool};

use crate::{
    domain,
    dto::{
        MoveAssetInput, MoveAssetsInput, MoveAssetsResultDto, PlaceAssetInput, PlacementDto,
        UnplaceAssetInput, UnplaceAssetResultDto,
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
            "已归档设备不能移动",
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
    let current = sqlx::query(
        "SELECT id, rack_id, start_u FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL LIMIT 1",
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
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
    let changed_at = now();
    sqlx::query("UPDATE rack_placements SET removed_at = ? WHERE id = ? AND removed_at IS NULL")
        .bind(&changed_at)
        .bind(&current_id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
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
        placed_at: changed_at,
    })
}

pub async fn move_assets(
    pool: &SqlitePool,
    input: MoveAssetsInput,
    operation_id: &str,
) -> Result<MoveAssetsResultDto, AppErrorDto> {
    if input.moves.is_empty() {
        return Err(AppErrorDto::validation(
            operation_id,
            "Placement.BatchEmpty",
            "没有需要保存的位置调整",
            "moves",
        ));
    }

    let mut seen_asset_ids = HashSet::new();
    let mut requested_moves = Vec::with_capacity(input.moves.len());
    for requested in input.moves {
        let asset_id = domain::required(&requested.asset_id, operation_id, "assetId")?;
        let rack_id = domain::required(&requested.rack_id, operation_id, "rackId")?;
        if !seen_asset_ids.insert(asset_id.clone()) {
            return Err(AppErrorDto::validation(
                operation_id,
                "Placement.DuplicateAsset",
                "同一设备不能重复提交位置调整",
                "moves",
            ));
        }
        requested_moves.push((asset_id, rack_id, requested.start_u));
    }

    #[derive(Clone)]
    struct ActivePlacement {
        id: String,
        rack_id: String,
        asset_id: String,
        start_u: i32,
        height_u: i32,
        asset_status: String,
    }

    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let active_placements = sqlx::query(
        r#"
        SELECT placement.id, placement.rack_id, placement.asset_id,
               placement.start_u, placement.height_u, asset.status AS asset_status
        FROM rack_placements placement
        JOIN assets asset ON asset.id = placement.asset_id
        WHERE placement.removed_at IS NULL
        "#,
    )
    .fetch_all(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?
    .into_iter()
    .map(|row| ActivePlacement {
        id: row.get("id"),
        rack_id: row.get("rack_id"),
        asset_id: row.get("asset_id"),
        start_u: row.get("start_u"),
        height_u: row.get("height_u"),
        asset_status: row.get("asset_status"),
    })
    .collect::<Vec<_>>();
    let current_by_asset = active_placements
        .iter()
        .cloned()
        .map(|placement| (placement.asset_id.clone(), placement))
        .collect::<HashMap<_, _>>();

    let rack_rows = sqlx::query("SELECT id, total_u, status FROM racks")
        .fetch_all(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let racks = rack_rows
        .into_iter()
        .map(|row| {
            let id: String = row.get("id");
            let total_u: i32 = row.get("total_u");
            let status: String = row.get("status");
            (id, (total_u, status))
        })
        .collect::<HashMap<_, _>>();

    for (asset_id, rack_id, start_u) in &requested_moves {
        let current = current_by_asset.get(asset_id).ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Placement.AssetNotPlaced",
                "设备尚未上架",
                "assetId",
            )
        })?;
        if current.asset_status == "archived" {
            return Err(AppErrorDto::validation(
                operation_id,
                "Placement.AssetUnavailable",
                "已归档设备不能移动",
                "assetId",
            ));
        }
        let (rack_total_u, rack_status) = racks.get(rack_id).ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Placement.RackUnavailable",
                "机柜不存在或不可用",
                "rackId",
            )
        })?;
        if rack_status != "active" {
            return Err(AppErrorDto::validation(
                operation_id,
                "Placement.RackUnavailable",
                "机柜不可用",
                "rackId",
            ));
        }
        domain::placement_range(
            *start_u,
            current.height_u,
            *rack_total_u,
            rack_id,
            operation_id,
        )?;
        if current.rack_id == *rack_id && current.start_u == *start_u {
            return Err(AppErrorDto::validation(
                operation_id,
                "Placement.Unchanged",
                "提交的位置没有变化",
                "moves",
            ));
        }
    }

    let requested_by_asset = requested_moves
        .iter()
        .map(|(asset_id, rack_id, start_u)| (asset_id.as_str(), (rack_id.as_str(), *start_u)))
        .collect::<HashMap<_, _>>();
    let mut occupied_by_rack: HashMap<String, Vec<(String, i32, i32)>> = HashMap::new();
    for placement in &active_placements {
        let (rack_id, start_u) = requested_by_asset
            .get(placement.asset_id.as_str())
            .copied()
            .unwrap_or((placement.rack_id.as_str(), placement.start_u));
        let (rack_total_u, rack_status) = racks.get(rack_id).ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Placement.RackUnavailable",
                "机柜不存在或不可用",
                "rackId",
            )
        })?;
        if rack_status != "active" {
            return Err(AppErrorDto::validation(
                operation_id,
                "Placement.RackUnavailable",
                "机柜不可用",
                "rackId",
            ));
        }
        let (_, end_u) = domain::placement_range(
            start_u,
            placement.height_u,
            *rack_total_u,
            rack_id,
            operation_id,
        )?;
        let occupied = occupied_by_rack.entry(rack_id.to_owned()).or_default();
        if let Some((conflicting_asset_id, _, _)) =
            occupied.iter().find(|(_, occupied_start, occupied_end)| {
                domain::ranges_overlap(start_u, end_u, *occupied_start, *occupied_end)
            })
        {
            return Err(AppErrorDto::placement(
                operation_id,
                "Placement.Overlap",
                "调整后的 U 位存在设备重叠",
                rack_id,
                start_u,
                end_u,
                Some(conflicting_asset_id.clone()),
            ));
        }
        occupied.push((placement.asset_id.clone(), start_u, end_u));
    }

    let changed_at = now();
    for (asset_id, _, _) in &requested_moves {
        let current = &current_by_asset[asset_id];
        sqlx::query(
            "UPDATE rack_placements SET removed_at = ? WHERE id = ? AND removed_at IS NULL",
        )
        .bind(&changed_at)
        .bind(&current.id)
        .execute(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }

    let mut placements = Vec::with_capacity(requested_moves.len());
    for (asset_id, rack_id, start_u) in requested_moves {
        let current = &current_by_asset[&asset_id];
        let placement_id = id();
        let end_u = start_u + current.height_u - 1;
        sqlx::query(
            "INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
        )
        .bind(&placement_id)
        .bind(&rack_id)
        .bind(&asset_id)
        .bind(start_u)
        .bind(current.height_u)
        .bind(&changed_at)
        .execute(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
        placements.push(PlacementDto {
            id: placement_id,
            rack_id,
            asset_id,
            start_u,
            end_u,
            height_u: current.height_u,
            placed_at: changed_at.clone(),
        });
    }

    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(MoveAssetsResultDto { placements })
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
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let placement_id: Option<String> = sqlx::query_scalar(
        "SELECT id FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL LIMIT 1",
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| AppErrorDto::database(operation_id, error))?;
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
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(UnplaceAssetResultDto {
        asset_id,
        placement_id,
        removed_at,
    })
}
