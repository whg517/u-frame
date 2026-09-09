use crate::{
    dto::{
        AssetPlacementMoveInput, CreateAreaInput, CreateAssetInput, CreateRackInput,
        CreateRoomInput, MoveAssetInput, MoveAssetsInput, PlaceAssetInput, ReorderRacksInput,
        UnplaceAssetInput, UpdateAreaInput, UpdateAssetInput, UpdateRackInput, UpdateRoomInput,
    },
    state::AppState,
};

use super::{
    create_area, create_asset, create_rack, create_room, get_rack_view, list_assets,
    list_locations, list_racks, move_asset, move_assets, place_asset, reorder_racks, seed_dev_data,
    unplace_asset, update_area, update_asset, update_rack, update_room,
};

async fn fixture() -> AppState {
    AppState::test().await.unwrap()
}

#[tokio::test]
async fn creates_complete_flow_and_returns_rack_view() {
    let state = fixture().await;
    let room = create_room(
        &state.pool,
        CreateRoomInput {
            code: "DC".into(),
            name: "机房".into(),
            description: None,
        },
        "op",
    )
    .await
    .unwrap();
    let area = create_area(
        &state.pool,
        CreateAreaInput {
            room_id: room.id,
            code: "A".into(),
            name: "A 区".into(),
            description: None,
        },
        "op",
    )
    .await
    .unwrap();
    let rack = create_rack(
        &state.pool,
        CreateRackInput {
            area_id: area.id,
            code: "A-01".into(),
            specification: "42U".into(),
            total_u: 42,
            power_capacity_w: None,
            notes: None,
        },
        "op",
    )
    .await
    .unwrap();
    let asset = create_asset(
        &state.pool,
        CreateAssetInput {
            asset_type: "server".into(),
            name: "srv-01".into(),
            hostname: None,
            intranet_ip: None,
            management_ip: None,
            serial_number: None,
            vendor: None,
            model: None,
            purpose: None,
            height_u: 2,
            status: "active".into(),
            notes: None,
        },
        "op",
    )
    .await
    .unwrap();
    place_asset(
        &state.pool,
        PlaceAssetInput {
            asset_id: asset.id,
            rack_id: rack.id.clone(),
            start_u: 41,
        },
        "op",
    )
    .await
    .unwrap();
    let view = get_rack_view(&state.pool, Some(rack.area_id), "op")
        .await
        .unwrap();
    assert_eq!(view.racks.len(), 1);
    assert_eq!(view.racks[0].placements[0].end_u, 42);
}

#[tokio::test]
async fn rejects_overlap_and_preserves_existing_placement() {
    let state = fixture().await;
    let room = create_room(
        &state.pool,
        CreateRoomInput {
            code: "DC".into(),
            name: "机房".into(),
            description: None,
        },
        "op",
    )
    .await
    .unwrap();
    let area = create_area(
        &state.pool,
        CreateAreaInput {
            room_id: room.id,
            code: "A".into(),
            name: "A 区".into(),
            description: None,
        },
        "op",
    )
    .await
    .unwrap();
    let rack = create_rack(
        &state.pool,
        CreateRackInput {
            area_id: area.id,
            code: "A-01".into(),
            specification: "18U".into(),
            total_u: 18,
            power_capacity_w: None,
            notes: None,
        },
        "op",
    )
    .await
    .unwrap();
    let make_asset = |name: &str| CreateAssetInput {
        asset_type: "server".into(),
        name: name.into(),
        hostname: None,
        intranet_ip: None,
        management_ip: None,
        serial_number: None,
        vendor: None,
        model: None,
        purpose: None,
        height_u: 2,
        status: "active".into(),
        notes: None,
    };
    let first = create_asset(&state.pool, make_asset("first"), "op")
        .await
        .unwrap();
    let second = create_asset(&state.pool, make_asset("second"), "op")
        .await
        .unwrap();
    place_asset(
        &state.pool,
        PlaceAssetInput {
            asset_id: first.id,
            rack_id: rack.id.clone(),
            start_u: 4,
        },
        "op",
    )
    .await
    .unwrap();
    let error = place_asset(
        &state.pool,
        PlaceAssetInput {
            asset_id: second.id,
            rack_id: rack.id,
            start_u: 5,
        },
        "op",
    )
    .await
    .unwrap_err();
    assert_eq!(error.code, "Placement.Overlap");
    let count: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements WHERE removed_at IS NULL")
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_eq!(count, 1);
}

#[tokio::test]
async fn moves_and_unplaces_asset_while_preserving_history() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let assets = list_assets(&state.pool, "op").await.unwrap();
    let asset = assets
        .iter()
        .find(|asset| asset.placement.is_some())
        .unwrap();
    let original = asset.placement.as_ref().unwrap();
    let unchanged = move_asset(
        &state.pool,
        MoveAssetInput {
            asset_id: asset.id.clone(),
            rack_id: original.rack_id.clone(),
            start_u: original.start_u,
        },
        "op",
    )
    .await
    .unwrap_err();
    assert_eq!(unchanged.code, "Placement.Unchanged");
    let racks = list_racks(&state.pool, None, "op").await.unwrap();
    let target = racks
        .iter()
        .find(|rack| rack.id != original.rack_id)
        .unwrap();

    let moved = move_asset(
        &state.pool,
        MoveAssetInput {
            asset_id: asset.id.clone(),
            rack_id: target.id.clone(),
            start_u: target.total_u - asset.height_u + 1,
        },
        "op",
    )
    .await
    .unwrap();
    assert_eq!(moved.rack_id, target.id);

    let active_count: i32 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM rack_placements WHERE asset_id = ? AND removed_at IS NULL",
    )
    .bind(&asset.id)
    .fetch_one(&state.pool)
    .await
    .unwrap();
    let history_count: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements WHERE asset_id = ?")
            .bind(&asset.id)
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_eq!(active_count, 1);
    assert_eq!(history_count, 2);

    unplace_asset(
        &state.pool,
        UnplaceAssetInput {
            asset_id: asset.id.clone(),
        },
        "op",
    )
    .await
    .unwrap();
    let refreshed = list_assets(&state.pool, "op").await.unwrap();
    assert!(
        refreshed
            .iter()
            .find(|item| item.id == asset.id)
            .unwrap()
            .placement
            .is_none()
    );
    let history_count: i32 =
        sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements WHERE asset_id = ?")
            .bind(&asset.id)
            .fetch_one(&state.pool)
            .await
            .unwrap();
    assert_eq!(history_count, 2);
}

#[tokio::test]
async fn moves_multiple_assets_atomically_and_allows_position_swaps() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let assets = list_assets(&state.pool, "op").await.unwrap();
    let first = assets
        .iter()
        .find(|asset| asset.name == "计算节点 01")
        .unwrap();
    let second = assets
        .iter()
        .find(|asset| asset.name == "核心交换机")
        .unwrap();
    let first_placement = first.placement.as_ref().unwrap();
    let second_placement = second.placement.as_ref().unwrap();

    let result = move_assets(
        &state.pool,
        MoveAssetsInput {
            moves: vec![
                AssetPlacementMoveInput {
                    asset_id: first.id.clone(),
                    rack_id: second_placement.rack_id.clone(),
                    start_u: second_placement.start_u,
                },
                AssetPlacementMoveInput {
                    asset_id: second.id.clone(),
                    rack_id: first_placement.rack_id.clone(),
                    start_u: first_placement.start_u,
                },
            ],
        },
        "op",
    )
    .await
    .unwrap();

    assert_eq!(result.placements.len(), 2);
    let refreshed = list_assets(&state.pool, "op").await.unwrap();
    let moved_first = refreshed.iter().find(|asset| asset.id == first.id).unwrap();
    let moved_second = refreshed
        .iter()
        .find(|asset| asset.id == second.id)
        .unwrap();
    assert_eq!(
        moved_first.placement.as_ref().unwrap().start_u,
        second_placement.start_u
    );
    assert_eq!(
        moved_second.placement.as_ref().unwrap().start_u,
        first_placement.start_u
    );
}

#[tokio::test]
async fn rejects_overlapping_batch_and_preserves_every_original_position() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let before = list_assets(&state.pool, "op").await.unwrap();
    let moving = ["计算节点 01", "核心交换机"]
        .iter()
        .map(|name| before.iter().find(|asset| asset.name == *name).unwrap())
        .collect::<Vec<_>>();
    let rack_id = moving[0].placement.as_ref().unwrap().rack_id.clone();

    let error = move_assets(
        &state.pool,
        MoveAssetsInput {
            moves: moving
                .iter()
                .map(|asset| AssetPlacementMoveInput {
                    asset_id: asset.id.clone(),
                    rack_id: rack_id.clone(),
                    start_u: 20,
                })
                .collect(),
        },
        "op",
    )
    .await
    .unwrap_err();
    assert_eq!(error.code, "Placement.Overlap");

    let after = list_assets(&state.pool, "op").await.unwrap();
    for original in moving {
        let current = after.iter().find(|asset| asset.id == original.id).unwrap();
        let current_placement = current.placement.as_ref().unwrap();
        let original_placement = original.placement.as_ref().unwrap();
        assert_eq!(
            current_placement.placement_id,
            original_placement.placement_id
        );
        assert_eq!(current_placement.rack_id, original_placement.rack_id);
        assert_eq!(current_placement.start_u, original_placement.start_u);
    }
}

#[tokio::test]
async fn failed_move_keeps_original_placement_active() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let assets = list_assets(&state.pool, "op").await.unwrap();
    let placed: Vec<_> = assets
        .iter()
        .filter(|asset| asset.placement.is_some())
        .collect();
    let moving = placed[0];
    let occupied = placed
        .iter()
        .find(|asset| {
            asset.placement.as_ref().unwrap().rack_id != moving.placement.as_ref().unwrap().rack_id
        })
        .unwrap();
    let target = occupied.placement.as_ref().unwrap();

    let error = move_asset(
        &state.pool,
        MoveAssetInput {
            asset_id: moving.id.clone(),
            rack_id: target.rack_id.clone(),
            start_u: target.start_u,
        },
        "op",
    )
    .await
    .unwrap_err();
    assert_eq!(error.code, "Placement.Overlap");

    let refreshed = list_assets(&state.pool, "op").await.unwrap();
    let placement = refreshed
        .iter()
        .find(|asset| asset.id == moving.id)
        .unwrap()
        .placement
        .as_ref()
        .unwrap();
    assert_eq!(
        placement.placement_id,
        moving.placement.as_ref().unwrap().placement_id
    );
}

#[tokio::test]
async fn batch_insert_failure_rolls_back_ended_rows_and_partial_inserts() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "seed").await.unwrap();
    let before = list_assets(&state.pool, "read").await.unwrap();
    let moving = ["计算节点 01", "核心交换机"]
        .iter()
        .map(|name| before.iter().find(|asset| asset.name == *name).unwrap())
        .collect::<Vec<_>>();
    let rack_id = moving[0].placement.as_ref().unwrap().rack_id.clone();
    let history_before: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements")
        .fetch_one(&state.pool)
        .await
        .unwrap();
    // The second insertion fails after all old rows ended and the first insert succeeded.
    sqlx::query(
        "CREATE TRIGGER fail_second_insert BEFORE INSERT ON rack_placements
        WHEN NEW.start_u = 24 BEGIN SELECT RAISE(ABORT, 'injected write failure'); END",
    )
    .execute(&state.pool)
    .await
    .unwrap();
    let error = move_assets(
        &state.pool,
        MoveAssetsInput {
            moves: moving
                .iter()
                .zip([20, 24])
                .map(|(asset, start_u)| AssetPlacementMoveInput {
                    asset_id: asset.id.clone(),
                    rack_id: rack_id.clone(),
                    start_u,
                })
                .collect(),
        },
        "rollback-test",
    )
    .await
    .unwrap_err();
    assert_eq!(error.code, "Database.OperationFailed");
    assert_eq!(error.operation_id, "rollback-test");
    let after = list_assets(&state.pool, "read").await.unwrap();
    for original in &before {
        let current = after.iter().find(|asset| asset.id == original.id).unwrap();
        assert_eq!(
            serde_json::to_value(&current.placement).unwrap(),
            serde_json::to_value(&original.placement).unwrap()
        );
    }
    let history_after: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM rack_placements")
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_eq!(history_after, history_before);
}

#[tokio::test]
async fn development_seed_is_manual_and_idempotent() {
    let state = fixture().await;
    let first = seed_dev_data(&state.pool, "op").await.unwrap();
    assert!(first.seeded);
    assert_eq!(first.racks, 3);
    assert_eq!(first.assets, 5);

    let second = seed_dev_data(&state.pool, "op").await.unwrap();
    assert!(!second.seeded);
    let view = get_rack_view(&state.pool, None, "op").await.unwrap();
    assert_eq!(view.racks.len(), 3);
    assert_eq!(
        view.racks
            .iter()
            .map(|rack| rack.placements.len())
            .sum::<usize>(),
        4
    );
}

#[tokio::test]
async fn reorders_visible_racks_and_preserves_hidden_slots() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let before = get_rack_view(&state.pool, None, "op").await.unwrap();
    let ids: Vec<String> = before
        .racks
        .iter()
        .map(|rack| rack.rack.id.clone())
        .collect();
    sqlx::query("UPDATE racks SET sort_order = 100 WHERE id = ?")
        .bind(&ids[1])
        .execute(&state.pool)
        .await
        .unwrap();
    sqlx::query("UPDATE racks SET sort_order = 101 WHERE id = ?")
        .bind(&ids[2])
        .execute(&state.pool)
        .await
        .unwrap();

    reorder_racks(
        &state.pool,
        ReorderRacksInput {
            rack_ids: vec![ids[2].clone(), ids[0].clone()],
        },
        "op",
    )
    .await
    .unwrap();

    let after = get_rack_view(&state.pool, None, "op").await.unwrap();
    let reordered: Vec<String> = after
        .racks
        .iter()
        .map(|rack| rack.rack.id.clone())
        .collect();
    assert_eq!(
        reordered,
        vec![ids[2].clone(), ids[1].clone(), ids[0].clone()]
    );
}

#[tokio::test]
async fn rejects_duplicate_rack_order_without_changing_data() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let before = get_rack_view(&state.pool, None, "op").await.unwrap();
    let first_id = before.racks[0].rack.id.clone();

    let error = reorder_racks(
        &state.pool,
        ReorderRacksInput {
            rack_ids: vec![first_id.clone(), first_id],
        },
        "op",
    )
    .await
    .unwrap_err();
    assert_eq!(error.code, "Rack.OrderDuplicate");

    let after = get_rack_view(&state.pool, None, "op").await.unwrap();
    assert_eq!(
        before
            .racks
            .iter()
            .map(|rack| &rack.rack.id)
            .collect::<Vec<_>>(),
        after
            .racks
            .iter()
            .map(|rack| &rack.rack.id)
            .collect::<Vec<_>>()
    );
}

#[tokio::test]
async fn updates_room_area_rack_and_asset_fields() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let locations = list_locations(&state.pool, "op").await.unwrap();
    let room = &locations.rooms[0].room;
    let area = &locations.rooms[0].areas[0];
    update_room(
        &state.pool,
        UpdateRoomInput {
            room_id: room.id.clone(),
            code: "LAB".into(),
            name: "实验机房".into(),
            description: Some("更新后的机房".into()),
        },
        "op",
    )
    .await
    .unwrap();
    update_area(
        &state.pool,
        UpdateAreaInput {
            area_id: area.id.clone(),
            room_id: room.id.clone(),
            code: "B".into(),
            name: "B 区".into(),
            description: Some("更新后的区域".into()),
        },
        "op",
    )
    .await
    .unwrap();
    let rack = list_racks(&state.pool, None, "op").await.unwrap().remove(0);
    update_rack(
        &state.pool,
        UpdateRackInput {
            rack_id: rack.id.clone(),
            area_id: area.id.clone(),
            code: "B-01".into(),
            specification: "45U".into(),
            total_u: 45,
            power_capacity_w: Some(8000),
            notes: Some("更新后的机柜".into()),
        },
        "op",
    )
    .await
    .unwrap();
    let asset = list_assets(&state.pool, "op")
        .await
        .unwrap()
        .into_iter()
        .find(|asset| {
            asset
                .placement
                .as_ref()
                .is_some_and(|placement| placement.start_u == 4)
        })
        .unwrap();
    let updated_asset = update_asset(
        &state.pool,
        UpdateAssetInput {
            asset_id: asset.id.clone(),
            asset_type: "server".into(),
            name: "更新后的设备".into(),
            hostname: Some("updated-node".into()),
            intranet_ip: Some("10.30.0.10".into()),
            management_ip: Some("10.30.1.10".into()),
            serial_number: Some("UPDATED-SN".into()),
            vendor: Some("UFrame".into()),
            model: Some("UF-2U".into()),
            purpose: Some("验收".into()),
            height_u: 3,
            status: "maintenance".into(),
            notes: Some("更新后的设备".into()),
        },
        "op",
    )
    .await
    .unwrap();

    assert_eq!(updated_asset.name, "更新后的设备");
    assert_eq!(updated_asset.management_ip.as_deref(), Some("10.30.1.10"));
    assert_eq!(updated_asset.height_u, 3);
    assert_eq!(updated_asset.placement.as_ref().unwrap().end_u, 6);
    let view = get_rack_view(&state.pool, None, "op").await.unwrap();
    let updated_rack = view
        .racks
        .iter()
        .find(|item| item.rack.id == rack.id)
        .unwrap();
    assert_eq!(updated_rack.rack.room_name, "实验机房");
    assert_eq!(updated_rack.rack.area_name, "B 区");
    assert_eq!(updated_rack.rack.code, "B-01");
    assert_eq!(updated_rack.rack.total_u, 45);
}

#[tokio::test]
async fn rejects_rack_shrink_that_would_hide_a_device() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let rack = get_rack_view(&state.pool, None, "op")
        .await
        .unwrap()
        .racks
        .into_iter()
        .find(|item| {
            item.placements
                .iter()
                .any(|placement| placement.start_u == 10)
        })
        .unwrap()
        .rack;

    let error = update_rack(
        &state.pool,
        UpdateRackInput {
            rack_id: rack.id.clone(),
            area_id: rack.area_id,
            code: rack.code,
            specification: "custom".into(),
            total_u: 9,
            power_capacity_w: rack.power_capacity_w,
            notes: rack.notes,
        },
        "op",
    )
    .await
    .unwrap_err();

    assert_eq!(error.code, "Rack.HeightOccupied");
    let unchanged: i32 = sqlx::query_scalar("SELECT total_u FROM racks WHERE id = ?")
        .bind(&rack.id)
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_eq!(unchanged, rack.total_u);
}

#[tokio::test]
async fn rejects_asset_height_overlap_and_keeps_original_height() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let asset = list_assets(&state.pool, "op")
        .await
        .unwrap()
        .into_iter()
        .find(|asset| {
            asset
                .placement
                .as_ref()
                .is_some_and(|placement| placement.start_u == 4)
        })
        .unwrap();

    let error = update_asset(
        &state.pool,
        UpdateAssetInput {
            asset_id: asset.id.clone(),
            asset_type: asset.asset_type,
            name: asset.name,
            hostname: asset.hostname,
            intranet_ip: asset.intranet_ip,
            management_ip: asset.management_ip,
            serial_number: asset.serial_number,
            vendor: asset.vendor,
            model: asset.model,
            purpose: asset.purpose,
            height_u: 7,
            status: asset.status,
            notes: asset.notes,
        },
        "op",
    )
    .await
    .unwrap_err();

    assert_eq!(error.code, "Placement.Overlap");
    let unchanged: i32 = sqlx::query_scalar("SELECT height_u FROM assets WHERE id = ?")
        .bind(&asset.id)
        .fetch_one(&state.pool)
        .await
        .unwrap();
    assert_eq!(unchanged, 2);
}

#[tokio::test]
async fn database_triggers_guard_direct_rack_and_asset_height_updates() {
    let state = fixture().await;
    seed_dev_data(&state.pool, "op").await.unwrap();
    let view = get_rack_view(&state.pool, None, "op").await.unwrap();
    let rack = view
        .racks
        .iter()
        .find(|item| {
            item.placements
                .iter()
                .any(|placement| placement.start_u == 10)
        })
        .unwrap();
    let rack_error = sqlx::query("UPDATE racks SET total_u = 9 WHERE id = ?")
        .bind(&rack.rack.id)
        .execute(&state.pool)
        .await
        .unwrap_err();
    assert!(rack_error.to_string().contains("Rack.HeightOccupied"));

    let lower_asset = rack
        .placements
        .iter()
        .find(|placement| placement.start_u == 4)
        .unwrap();
    let asset_error = sqlx::query("UPDATE assets SET height_u = 7 WHERE id = ?")
        .bind(&lower_asset.asset_id)
        .execute(&state.pool)
        .await
        .unwrap_err();
    assert!(asset_error.to_string().contains("Placement.Overlap"));
}
