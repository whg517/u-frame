use crate::infrastructure::database_error::database_error;
use sqlx::{Row, SqlitePool};

use crate::{
    application::validation as domain,
    dto::{AssetDto, CreateAssetInput, UpdateAssetInput},
    error::AppErrorDto,
    infrastructure::repository,
};

use super::{asset_dto, id, now};

pub async fn list_assets(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<Vec<AssetDto>, AppErrorDto> {
    repository::list_assets(pool)
        .await
        .map(|rows| rows.into_iter().map(asset_dto).collect())
        .map_err(|error| database_error(operation_id, error))
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
    .map_err(|error| database_error(operation_id, error))?;
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

pub async fn update_asset(
    pool: &SqlitePool,
    input: UpdateAssetInput,
    operation_id: &str,
) -> Result<AssetDto, AppErrorDto> {
    domain::validate_asset_update(&input, operation_id)?;
    let asset_id = domain::required(&input.asset_id, operation_id, "assetId")?;
    let name = domain::required(&input.name, operation_id, "name")?;
    let hostname = domain::optional(input.hostname);
    let intranet_ip = domain::optional(input.intranet_ip);
    let management_ip = domain::optional(input.management_ip);
    let serial_number = domain::optional(input.serial_number);
    let vendor = domain::optional(input.vendor);
    let model = domain::optional(input.model);
    let purpose = domain::optional(input.purpose);
    let notes = domain::optional(input.notes);
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    let current = sqlx::query(
        r#"
        SELECT asset.id, placement.id AS placement_id, placement.rack_id, placement.start_u,
               rack.total_u
        FROM assets asset
        LEFT JOIN rack_placements placement
          ON placement.asset_id = asset.id AND placement.removed_at IS NULL
        LEFT JOIN racks rack ON rack.id = placement.rack_id
        WHERE asset.id = ? AND asset.status != 'archived'
        "#,
    )
    .bind(&asset_id)
    .fetch_optional(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    let Some(current) = current else {
        return Err(AppErrorDto::validation(
            operation_id,
            "Asset.NotFound",
            "设备不存在或不可用",
            "assetId",
        ));
    };
    if let (Some(placement_id), Some(rack_id), Some(start_u), Some(total_u)) = (
        current.try_get::<String, _>("placement_id").ok(),
        current.try_get::<String, _>("rack_id").ok(),
        current.try_get::<i32, _>("start_u").ok(),
        current.try_get::<i32, _>("total_u").ok(),
    ) {
        let (_, end_u) =
            domain::placement_range(start_u, input.height_u, total_u, &rack_id, operation_id)?;
        let conflict: Option<String> = sqlx::query_scalar(
            r#"
            SELECT asset_id FROM rack_placements
            WHERE rack_id = ? AND id != ? AND removed_at IS NULL
              AND start_u <= ? AND start_u + height_u - 1 >= ?
            LIMIT 1
            "#,
        )
        .bind(&rack_id)
        .bind(&placement_id)
        .bind(end_u)
        .bind(start_u)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| database_error(operation_id, error))?;
        if let Some(conflicting_asset_id) = conflict {
            return Err(AppErrorDto::placement(
                operation_id,
                "Placement.Overlap",
                "修改后的设备高度与现有设备重叠",
                &rack_id,
                start_u,
                end_u,
                Some(conflicting_asset_id),
            ));
        }
    }
    let timestamp = now();
    sqlx::query(
        r#"
        UPDATE assets SET type = ?, name = ?, hostname = ?, intranet_ip = ?, management_ip = ?,
            serial_number = ?, vendor = ?, model = ?, purpose = ?, height_u = ?, status = ?,
            notes = ?, updated_at = ?
        WHERE id = ? AND status != 'archived'
        "#,
    )
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
    .bind(&asset_id)
    .execute(&mut *transaction)
    .await
    .map_err(|error| database_error(operation_id, error))?;
    transaction
        .commit()
        .await
        .map_err(|error| database_error(operation_id, error))?;
    repository::find_asset(pool, &asset_id)
        .await
        .map_err(|error| database_error(operation_id, error))?
        .map(asset_dto)
        .ok_or_else(|| {
            AppErrorDto::validation(
                operation_id,
                "Asset.NotFound",
                "设备不存在或不可用",
                "assetId",
            )
        })
}
