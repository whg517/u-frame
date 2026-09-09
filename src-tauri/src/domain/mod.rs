use std::net::IpAddr;

pub mod layout;
#[cfg(test)]
mod layout_tests;
mod violation;
pub use violation::{RuleDetails, RuleViolation};

pub const COMMON_RACK_SIZES: [i32; 8] = [18, 22, 27, 32, 37, 42, 45, 47];
pub const ASSET_TYPES: [&str; 4] = ["server", "switch", "router", "firewall"];
pub const ASSET_STATUSES: [&str; 3] = ["active", "maintenance", "offline"];

pub fn required(value: &str, field: &'static str) -> Result<String, RuleViolation> {
    let value = value.trim();
    if value.is_empty() {
        return Err(RuleViolation::validation(
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
) -> Result<(), RuleViolation> {
    if !(1..=100).contains(&total_u) {
        return Err(RuleViolation::validation(
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
        return Err(RuleViolation::validation(
            "Rack.InvalidSpecification",
            "不支持的机柜规格",
            "specification",
        ));
    }
    if specification != "custom" && specification != format!("{total_u}U") {
        return Err(RuleViolation::validation(
            "Rack.SpecificationMismatch",
            "机柜规格与总 U 数不一致",
            "totalU",
        ));
    }
    if power_capacity_w.is_some_and(|value| value < 0) {
        return Err(RuleViolation::validation(
            "Rack.InvalidPowerCapacity",
            "额定功率不能为负数",
            "powerCapacityW",
        ));
    }
    Ok(())
}

pub fn validate_asset_fields(
    asset_type: &str,
    status: &str,
    height_u: i32,
    intranet_ip: Option<&str>,
    management_ip: Option<&str>,
) -> Result<(), RuleViolation> {
    if !ASSET_TYPES.contains(&asset_type) {
        return Err(RuleViolation::validation(
            "Asset.InvalidType",
            "不支持的设备类型",
            "type",
        ));
    }
    if !ASSET_STATUSES.contains(&status) {
        return Err(RuleViolation::validation(
            "Asset.InvalidStatus",
            "不支持的设备状态",
            "status",
        ));
    }
    if !(1..=100).contains(&height_u) {
        return Err(RuleViolation::validation(
            "Asset.InvalidHeight",
            "设备高度必须在 1U 到 100U 之间",
            "heightU",
        ));
    }
    for (field, value) in [("intranetIp", intranet_ip), ("managementIp", management_ip)] {
        if let Some(value) = value.filter(|value| !value.trim().is_empty())
            && value.trim().parse::<IpAddr>().is_err()
        {
            return Err(RuleViolation::validation(
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
) -> Result<(i32, i32), RuleViolation> {
    let checked_end = height_u
        .checked_sub(1)
        .and_then(|offset| start_u.checked_add(offset));
    let end_u = checked_end.unwrap_or(i32::MAX);
    if start_u < 1 || height_u < 1 || checked_end.is_none() || end_u > rack_total_u {
        return Err(RuleViolation::placement(
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
        assert_eq!(placement_range(41, 2, 42, "rack").unwrap(), (41, 42));
    }

    #[test]
    fn rejects_out_of_range_placement() {
        let error = placement_range(42, 2, 42, "rack").unwrap_err();
        assert_eq!(error.code, "Placement.OutOfRange");
    }

    #[test]
    fn adjacent_ranges_do_not_overlap() {
        assert!(!ranges_overlap(1, 2, 3, 4));
        assert!(ranges_overlap(1, 2, 2, 3));
    }

    #[test]
    fn rejects_arithmetic_overflow() {
        assert!(placement_range(i32::MAX, 2, i32::MAX, "rack").is_err());
        assert!(placement_range(1, i32::MIN, 42, "rack").is_err());
    }

    #[test]
    fn validates_asset_and_rack_without_runtime_dependencies() {
        assert!(
            super::validate_asset_fields("server", "active", 2, Some("2001:db8::1"), None).is_ok()
        );
        assert_eq!(
            super::validate_asset_fields("server", "active", 2, Some("999.1.1.1"), None)
                .unwrap_err()
                .code,
            "Asset.InvalidIp"
        );
        assert!(super::validate_rack("42U", 27, None).is_err());
        assert!(super::validate_rack("custom", 27, None).is_ok());
    }
}
