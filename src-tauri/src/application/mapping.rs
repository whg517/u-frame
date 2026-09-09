use crate::{
    dto::{AreaDto, AssetDto, AssetPlacementDto, RackDto, RoomDto},
    infrastructure::repository,
};

pub(super) fn room_dto(row: repository::RoomRow) -> RoomDto {
    RoomDto {
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
    }
}

pub(super) fn area_dto(row: repository::AreaRow) -> AreaDto {
    AreaDto {
        id: row.id,
        room_id: row.room_id,
        code: row.code,
        name: row.name,
        description: row.description,
        status: row.status,
    }
}

pub(super) fn rack_dto(row: repository::RackRow) -> RackDto {
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

pub(super) fn asset_dto(row: repository::AssetRow) -> AssetDto {
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
