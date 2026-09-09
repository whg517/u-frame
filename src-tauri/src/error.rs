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
}

pub fn operation_id() -> String {
    Uuid::now_v7().to_string()
}
