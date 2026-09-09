use super::layout::{ActivePlacement, LayoutSnapshot, plan_moves};

fn snapshot() -> LayoutSnapshot {
    LayoutSnapshot {
        racks: [("rack".into(), (42, "active".into()))].into(),
        placements: [("one", 1), ("two", 3)]
            .into_iter()
            .map(|(asset, start)| ActivePlacement {
                id: format!("p-{asset}"),
                rack_id: "rack".into(),
                asset_id: asset.into(),
                start_u: start,
                height_u: 2,
                asset_status: "active".into(),
            })
            .collect(),
    }
}

#[test]
fn plans_swaps_without_mutating_the_snapshot() {
    let state = snapshot();
    let plan = plan_moves(
        &state,
        vec![
            ("one".into(), "rack".into(), 3),
            ("two".into(), "rack".into(), 1),
        ],
    )
    .unwrap();
    assert_eq!(
        plan.iter()
            .map(|p| (p.start_u, p.end_u))
            .collect::<Vec<_>>(),
        [(3, 4), (1, 2)]
    );
    assert_eq!(state.placements[0].start_u, 1);
}

#[test]
fn rejects_overlap_and_invalid_requests() {
    for (requests, code) in [
        (vec![], "Placement.BatchEmpty"),
        (vec![("one", 1)], "Placement.Unchanged"),
        (vec![("one", 2)], "Placement.Overlap"),
        (vec![("one", 42)], "Placement.OutOfRange"),
        (vec![("one", 0)], "Placement.OutOfRange"),
        (vec![("missing", 5)], "Placement.AssetNotPlaced"),
        (vec![("one", 5), ("one", 7)], "Placement.DuplicateAsset"),
    ] {
        let result = plan_moves(
            &snapshot(),
            requests
                .into_iter()
                .map(|(id, start)| (id.into(), "rack".into(), start))
                .collect(),
        );
        assert_eq!(result.unwrap_err().code, code);
    }
}

#[test]
fn refuses_archived_targets_and_assets() {
    let mut state = snapshot();
    state.racks.get_mut("rack").unwrap().1 = "archived".into();
    assert_eq!(
        plan_moves(&state, vec![("one".into(), "rack".into(), 5)])
            .unwrap_err()
            .code,
        "Placement.RackUnavailable"
    );
    state.racks.get_mut("rack").unwrap().1 = "active".into();
    state.placements[0].asset_status = "archived".into();
    assert_eq!(
        plan_moves(&state, vec![("one".into(), "rack".into(), 5)])
            .unwrap_err()
            .code,
        "Placement.AssetUnavailable"
    );
}

#[test]
fn validated_range_does_not_overflow_when_constructing_the_plan() {
    let mut state = snapshot();
    state.racks.get_mut("rack").unwrap().0 = i32::MAX;
    state.placements[0].height_u = 1;
    let plan = plan_moves(&state, vec![("one".into(), "rack".into(), i32::MAX)]).unwrap();
    assert_eq!(plan[0].end_u, i32::MAX);
}
