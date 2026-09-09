#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleDetails {
    pub field: Option<&'static str>,
    pub rack_id: Option<String>,
    pub start_u: Option<i32>,
    pub end_u: Option<i32>,
    pub conflicting_asset_id: Option<String>,
}

/// Business failure only: no serialization, operation tracking or storage dependency.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RuleViolation {
    pub code: &'static str,
    pub message: &'static str,
    pub details: RuleDetails,
}

impl RuleViolation {
    pub fn validation(code: &'static str, message: &'static str, field: &'static str) -> Self {
        Self {
            code,
            message,
            details: RuleDetails {
                field: Some(field),
                rack_id: None,
                start_u: None,
                end_u: None,
                conflicting_asset_id: None,
            },
        }
    }

    pub fn placement(
        code: &'static str,
        message: &'static str,
        rack_id: &str,
        start_u: i32,
        end_u: i32,
        conflicting_asset_id: Option<String>,
    ) -> Self {
        Self {
            code,
            message,
            details: RuleDetails {
                field: Some("startU"),
                rack_id: Some(rack_id.into()),
                start_u: Some(start_u),
                end_u: Some(end_u),
                conflicting_asset_id,
            },
        }
    }
}
