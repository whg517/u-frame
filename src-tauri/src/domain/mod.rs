use std::net::IpAddr;

use crate::{dto::CreateAssetInput, error::AppErrorDto};

pub const COMMON_RACK_SIZES: [i32; 8] = [18, 22, 27, 32, 37, 42, 45, 47];
pub const ASSET_TYPES: [&str; 4] = ["server", "switch", "router", "firewall"];
pub const ASSET_STATUSES: [&str; 3] = ["active", "maintenance", "offline"];

pub fn required(value: &str, operation_id: &str, field: &str) -> Result<String, AppErrorDto> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppErrorDto::validation(
            operation_id,
            "Validation.Required",
            "必填字段不能为空",
            field,
        ));
    }
    Ok(value.to_owned())
}

pub fn optional(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let value = value.trim().to_owned();
        (!value.is_empty()).then_some(value)
    })
}

pub fn validate_rack(
    specification: &str,
    total_u: i32,
    power_capacity_w: Option<i32>,
    operation_id: &str,
) -> Result<(), AppErrorDto> {
    if !(1..=100).contains(&total_u) {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.InvalidHeight",
            "机柜总 U 数必须在 1 到 100 之间",
            "totalU",
        ));
    }
    let valid_spec = specification == "custom"
        || COMMON_RACK_SIZES
            .iter()
            .any(|size| specification == format!("{size}U"));
    if !valid_spec {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.InvalidSpecification",
            "不支持的机柜规格",
            "specification",
        ));
    }
    if specification != "custom" && specification != format!("{total_u}U") {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.SpecificationMismatch",
            "机柜规格与总 U 数不一致",
            "totalU",
        ));
    }
    if power_capacity_w.is_some_and(|value| value < 0) {
        return Err(AppErrorDto::validation(
            operation_id,
            "Rack.InvalidPowerCapacity",
            "额定功率不能为负数",
            "powerCapacityW",
        ));
    }
    Ok(())
}

pub fn validate_asset(input: &CreateAssetInput, operation_id: &str) -> Result<(), AppErrorDto> {
    if !ASSET_TYPES.contains(&input.asset_type.as_str()) {
        return Err(AppErrorDto::validation(
            operation_id,
            "Asset.InvalidType",
            "不支持的设备类型",
            "type",
        ));
    }
    if !ASSET_STATUSES.contains(&input.status.as_str()) {
        return Err(AppErrorDto::validation(
            operation_id,
            "Asset.InvalidStatus",
            "不支持的设备状态",
            "status",
        ));
    }
    if input.height_u < 1 || input.height_u > 100 {
        return Err(AppErrorDto::validation(
            operation_id,
            "Asset.InvalidHeight",
            "设备高度必须在 1U 到 100U 之间",
            "heightU",
        ));
    }
    for (field, value) in [
        ("intranetIp", input.intranet_ip.as_deref()),
        ("managementIp", input.management_ip.as_deref()),
    ] {
        if let Some(value) = value.filter(|value| !value.trim().is_empty())
            && value.trim().parse::<IpAddr>().is_err()
        {
            return Err(AppErrorDto::validation(
                operation_id,
                "Asset.InvalidIp",
                "IP 地址格式不正确",
                field,
            ));
        }
    }
    Ok(())
}

pub fn placement_range(
    start_u: i32,
    height_u: i32,
    rack_total_u: i32,
    rack_id: &str,
    operation_id: &str,
) -> Result<(i32, i32), AppErrorDto> {
    let end_u = start_u.saturating_add(height_u).saturating_sub(1);
    if start_u < 1 || height_u < 1 || end_u > rack_total_u {
        return Err(AppErrorDto::placement(
            operation_id,
            "Placement.OutOfRange",
            "设备占用范围超出机柜 U 位",
            rack_id,
            start_u,
            end_u,
            None,
        ));
    }
    Ok((start_u, end_u))
}

pub fn ranges_overlap(start_a: i32, end_a: i32, start_b: i32, end_b: i32) -> bool {
    start_a <= end_b && end_a >= start_b
}

#[cfg(test)]
mod tests {
    use super::{placement_range, ranges_overlap};

    #[test]
    fn accepts_exact_rack_boundaries() {
        assert_eq!(placement_range(41, 2, 42, "rack", "op").unwrap(), (41, 42));
    }

    #[test]
    fn rejects_out_of_range_placement() {
        let error = placement_range(42, 2, 42, "rack", "op").unwrap_err();
        assert_eq!(error.code, "Placement.OutOfRange");
    }

    #[test]
    fn adjacent_ranges_do_not_overlap() {
        assert!(!ranges_overlap(1, 2, 3, 4));
        assert!(ranges_overlap(1, 2, 2, 3));
    }
}
