use crate::{application::ports::StorageError, error::AppErrorDto};

pub fn database_error(operation_id: &str, error: sqlx::Error) -> AppErrorDto {
    let failure = classify_database_error(error);
    AppErrorDto::simple(operation_id, failure.code, failure.message)
}

pub(crate) fn classify_database_error(error: sqlx::Error) -> StorageError {
    let text = error.to_string();
    let (code, message) = if text.contains("rooms.code") {
        ("Room.CodeConflict", "机房编码已存在")
    } else if text.contains("areas.room_id, areas.code") {
        ("Area.CodeConflict", "同一机房内区域编码已存在")
    } else if text.contains("areas.room_id, areas.name") {
        ("Area.NameConflict", "同一机房内区域名称已存在")
    } else if text.contains("racks.area_id, racks.code") {
        ("Rack.CodeConflict", "同一区域内机柜编码已存在")
    } else if text.contains("assets.hostname") {
        ("Asset.HostnameConflict", "主机名已存在")
    } else if text.contains("assets.intranet_ip") {
        ("Asset.IntranetIpConflict", "内网 IP 已存在")
    } else if text.contains("assets.serial_number") {
        ("Asset.SerialNumberConflict", "序列号已存在")
    } else if text.contains("rack_placements_one_active_per_asset")
        || text.contains("rack_placements.asset_id")
    {
        ("Placement.AssetAlreadyPlaced", "设备已经上架")
    } else if text.contains("Placement.Overlap") {
        ("Placement.Overlap", "目标 U 位已被占用")
    } else if text.contains("Placement.OutOfRange") {
        ("Placement.OutOfRange", "目标 U 位超出机柜范围")
    } else if text.contains("Rack.HeightOccupied") {
        ("Rack.HeightOccupied", "机柜缩容会使现有设备超出 U 位范围")
    } else {
        ("Database.OperationFailed", "数据库操作失败")
    };
    StorageError { code, message }
}
