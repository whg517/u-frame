use super::{RuleViolation, required};
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug)]
pub struct ActivePlacement {
    pub id: String,
    pub rack_id: String,
    pub asset_id: String,
    pub start_u: i32,
    pub height_u: i32,
    pub asset_status: String,
}

#[derive(Default)]
pub struct LayoutSnapshot {
    pub placements: Vec<ActivePlacement>,
    pub racks: HashMap<String, (i32, String)>,
}

#[derive(Debug)]
pub struct PlannedMove {
    pub previous_id: String,
    pub asset_id: String,
    pub rack_id: String,
    pub start_u: i32,
    pub height_u: i32,
    pub end_u: i32,
}

pub fn plan_moves(
    snapshot: &LayoutSnapshot,
    moves: Vec<(String, String, i32)>,
) -> Result<Vec<PlannedMove>, RuleViolation> {
    if moves.is_empty() {
        return Err(RuleViolation::validation(
            "Placement.BatchEmpty",
            "没有需要保存的位置调整",
            "moves",
        ));
    }
    let mut seen = HashSet::new();
    let mut requested_moves = Vec::with_capacity(moves.len());
    for (asset_id, rack_id, start_u) in moves {
        let asset_id = required(&asset_id, "assetId")?;
        let rack_id = required(&rack_id, "rackId")?;
        if !seen.insert(asset_id.clone()) {
            return Err(RuleViolation::validation(
                "Placement.DuplicateAsset",
                "同一设备不能重复提交位置调整",
                "moves",
            ));
        }
        requested_moves.push((asset_id, rack_id, start_u));
    }
    let active_placements = &snapshot.placements;
    let racks = &snapshot.racks;
    let current_by_asset = active_placements
        .iter()
        .map(|p| (p.asset_id.clone(), p))
        .collect::<HashMap<_, _>>();
    for (asset_id, rack_id, start_u) in &requested_moves {
        let current = current_by_asset.get(asset_id).ok_or_else(|| {
            RuleViolation::validation("Placement.AssetNotPlaced", "设备尚未上架", "assetId")
        })?;
        if current.asset_status == "archived" {
            return Err(RuleViolation::validation(
                "Placement.AssetUnavailable",
                "已归档设备不能移动",
                "assetId",
            ));
        }
        let (rack_total_u, rack_status) = racks.get(rack_id).ok_or_else(|| {
            RuleViolation::validation("Placement.RackUnavailable", "机柜不存在或不可用", "rackId")
        })?;
        if rack_status != "active" {
            return Err(RuleViolation::validation(
                "Placement.RackUnavailable",
                "机柜不可用",
                "rackId",
            ));
        }
        super::placement_range(*start_u, current.height_u, *rack_total_u, rack_id)?;
        if current.rack_id == *rack_id && current.start_u == *start_u {
            return Err(RuleViolation::validation(
                "Placement.Unchanged",
                "提交的位置没有变化",
                "moves",
            ));
        }
    }

    let requested_by_asset = requested_moves
        .iter()
        .map(|(asset_id, rack_id, start_u)| (asset_id.as_str(), (rack_id.as_str(), *start_u)))
        .collect::<HashMap<_, _>>();
    let mut occupied_by_rack: HashMap<String, Vec<(String, i32, i32)>> = HashMap::new();
    for placement in active_placements {
        let (rack_id, start_u) = requested_by_asset
            .get(placement.asset_id.as_str())
            .copied()
            .unwrap_or((placement.rack_id.as_str(), placement.start_u));
        let (rack_total_u, rack_status) = racks.get(rack_id).ok_or_else(|| {
            RuleViolation::validation("Placement.RackUnavailable", "机柜不存在或不可用", "rackId")
        })?;
        if rack_status != "active" {
            return Err(RuleViolation::validation(
                "Placement.RackUnavailable",
                "机柜不可用",
                "rackId",
            ));
        }
        let (_, end_u) =
            super::placement_range(start_u, placement.height_u, *rack_total_u, rack_id)?;
        let occupied = occupied_by_rack.entry(rack_id.to_owned()).or_default();
        if let Some((conflicting_asset_id, _, _)) =
            occupied.iter().find(|(_, occupied_start, occupied_end)| {
                super::ranges_overlap(start_u, end_u, *occupied_start, *occupied_end)
            })
        {
            return Err(RuleViolation::placement(
                "Placement.Overlap",
                "调整后的 U 位存在设备重叠",
                rack_id,
                start_u,
                end_u,
                Some(conflicting_asset_id.clone()),
            ));
        }
        occupied.push((placement.asset_id.clone(), start_u, end_u));
    }

    Ok(requested_moves
        .into_iter()
        .map(|(asset_id, rack_id, start_u)| {
            let current = &current_by_asset[&asset_id];
            PlannedMove {
                previous_id: current.id.clone(),
                asset_id,
                rack_id,
                start_u,
                height_u: current.height_u,
                end_u: start_u + (current.height_u - 1),
            }
        })
        .collect())
}
