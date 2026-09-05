use serde::Serialize;
use specta::Type;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ErrorDetailsDto {
    pub field: Option<String>,
    pub rack_id: Option<String>,
    pub start_u: Option<i32>,
    pub end_u: Option<i32>,
    pub conflicting_asset_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppErrorDto {
    pub code: String,
    pub message: String,
    pub details: Option<Box<ErrorDetailsDto>>,
    pub operation_id: String,
}

impl AppErrorDto {
    pub fn validation(operation_id: &str, code: &str, message: &str, field: &str) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: Some(Box::new(ErrorDetailsDto {
                field: Some(field.into()),
                rack_id: None,
                start_u: None,
                end_u: None,
                conflicting_asset_id: None,
            })),
            operation_id: operation_id.into(),
        }
    }

    pub fn placement(
        operation_id: &str,
        code: &str,
        message: &str,
        rack_id: &str,
        start_u: i32,
        end_u: i32,
        conflicting_asset_id: Option<String>,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: Some(Box::new(ErrorDetailsDto {
                field: Some("startU".into()),
                rack_id: Some(rack_id.into()),
                start_u: Some(start_u),
                end_u: Some(end_u),
                conflicting_asset_id,
            })),
            operation_id: operation_id.into(),
        }
    }

    pub fn simple(operation_id: &str, code: &str, message: &str) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
            operation_id: operation_id.into(),
        }
    }

    pub fn database(operation_id: &str, error: sqlx::Error) -> Self {
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
        Self::simple(operation_id, code, message)
    }
}

pub fn operation_id() -> String {
    Uuid::now_v7().to_string()
}
