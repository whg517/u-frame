use crate::{
    domain::{self, RuleViolation},
    dto::{CreateAssetInput, UpdateAssetInput},
    error::{AppErrorDto, ErrorDetailsDto},
};

pub use domain::optional;

pub fn rule_error(error: RuleViolation, operation_id: &str) -> AppErrorDto {
    AppErrorDto {
        code: error.code.into(),
        message: error.message.into(),
        operation_id: operation_id.into(),
        details: Some(Box::new(ErrorDetailsDto {
            field: error.details.field.map(str::to_owned),
            rack_id: error.details.rack_id,
            start_u: error.details.start_u,
            end_u: error.details.end_u,
            conflicting_asset_id: error.details.conflicting_asset_id,
        })),
    }
}

pub fn required(
    value: &str,
    operation_id: &str,
    field: &'static str,
) -> Result<String, AppErrorDto> {
    domain::required(value, field).map_err(|error| rule_error(error, operation_id))
}

pub fn validate_rack(
    specification: &str,
    total_u: i32,
    power_capacity_w: Option<i32>,
    operation_id: &str,
) -> Result<(), AppErrorDto> {
    domain::validate_rack(specification, total_u, power_capacity_w)
        .map_err(|error| rule_error(error, operation_id))
}

pub fn validate_asset(input: &CreateAssetInput, operation_id: &str) -> Result<(), AppErrorDto> {
    domain::validate_asset_fields(
        &input.asset_type,
        &input.status,
        input.height_u,
        input.intranet_ip.as_deref(),
        input.management_ip.as_deref(),
    )
    .map_err(|error| rule_error(error, operation_id))
}

pub fn validate_asset_update(
    input: &UpdateAssetInput,
    operation_id: &str,
) -> Result<(), AppErrorDto> {
    domain::validate_asset_fields(
        &input.asset_type,
        &input.status,
        input.height_u,
        input.intranet_ip.as_deref(),
        input.management_ip.as_deref(),
    )
    .map_err(|error| rule_error(error, operation_id))
}

pub fn placement_range(
    start_u: i32,
    height_u: i32,
    rack_total_u: i32,
    rack_id: &str,
    operation_id: &str,
) -> Result<(i32, i32), AppErrorDto> {
    domain::placement_range(start_u, height_u, rack_total_u, rack_id)
        .map_err(|error| rule_error(error, operation_id))
}
