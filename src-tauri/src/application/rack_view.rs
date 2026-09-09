use crate::infrastructure::database_error::database_error;
use std::collections::HashMap;

use sqlx::SqlitePool;

use crate::{
    dto::{RackCanvasDto, RackDto, RackPlacementViewDto, RackViewDto},
    error::AppErrorDto,
    infrastructure::repository,
};

pub async fn get_rack_view(
    pool: &SqlitePool,
    area_id: Option<String>,
    operation_id: &str,
) -> Result<RackViewDto, AppErrorDto> {
    let rows = repository::rack_view(pool, area_id.as_deref())
        .await
        .map_err(|error| database_error(operation_id, error))?;
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
