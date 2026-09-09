use sqlx::SqlitePool;

use crate::{dto::SeedResultDto, error::AppErrorDto, infrastructure::repository};

use super::{id, now};

pub async fn seed_dev_data(
    pool: &SqlitePool,
    operation_id: &str,
) -> Result<SeedResultDto, AppErrorDto> {
    let mut transaction = pool
        .begin()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    let row_count = repository::core_row_count(&mut *transaction)
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    if row_count > 0 {
        let fixture_exists: i32 =
            sqlx::query_scalar("SELECT COUNT(*) FROM rooms WHERE code = 'DEV-LAB'")
                .fetch_one(&mut *transaction)
                .await
                .map_err(|error| AppErrorDto::database(operation_id, error))?;
        if fixture_exists > 0 {
            return Ok(SeedResultDto {
                seeded: false,
                rooms: 0,
                areas: 0,
                racks: 0,
                assets: 0,
                placements: 0,
            });
        }
        return Err(AppErrorDto::simple(
            operation_id,
            "DevData.NotEmpty",
            "当前数据库已有业务数据，不能加载开发样例",
        ));
    }

    let timestamp = now();
    let room_id = id();
    let area_id = id();
    sqlx::query("INSERT INTO rooms (id, code, name, description, status, created_at, updated_at) VALUES (?, 'DEV-LAB', '研发实验室', '仅用于调试构建的样例机房', 'active', ?, ?)")
        .bind(&room_id).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    sqlx::query("INSERT INTO areas (id, room_id, code, name, description, status, created_at, updated_at) VALUES (?, ?, 'A', 'A 区', NULL, 'active', ?, ?)")
        .bind(&area_id).bind(&room_id).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;

    let racks = [
        (id(), "A-01", "42U", 42_i32),
        (id(), "A-02", "27U", 27_i32),
        (id(), "EDGE-01", "18U", 18_i32),
    ];
    for (sort_order, (rack_id, code, specification, total_u)) in racks.iter().enumerate() {
        sqlx::query("INSERT INTO racks (id, area_id, code, specification, total_u, power_capacity_w, status, notes, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, NULL, 'active', NULL, ?, ?, ?)")
            .bind(rack_id).bind(&area_id).bind(code).bind(specification).bind(total_u).bind(&timestamp).bind(&timestamp).bind(sort_order as i64).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }

    let assets = [
        (
            id(),
            "server",
            "计算节点 01",
            Some("compute-01"),
            Some("10.20.0.11"),
            2_i32,
            "active",
        ),
        (
            id(),
            "switch",
            "核心交换机",
            Some("switch-core"),
            Some("10.20.0.2"),
            1_i32,
            "active",
        ),
        (
            id(),
            "router",
            "边界路由器",
            Some("router-edge"),
            Some("10.20.0.1"),
            1_i32,
            "active",
        ),
        (
            id(),
            "firewall",
            "出口防火墙",
            Some("firewall-01"),
            Some("10.20.0.3"),
            1_i32,
            "maintenance",
        ),
        (
            id(),
            "server",
            "待上架服务器",
            Some("server-pending"),
            None,
            2_i32,
            "offline",
        ),
    ];
    for (asset_id, asset_type, name, hostname, intranet_ip, height_u, status) in &assets {
        sqlx::query("INSERT INTO assets (id, type, name, hostname, intranet_ip, management_ip, serial_number, vendor, model, purpose, height_u, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL, ?, ?)")
            .bind(asset_id).bind(asset_type).bind(name).bind(hostname).bind(intranet_ip).bind(height_u).bind(status).bind(&timestamp).bind(&timestamp).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    for (asset_index, rack_index, start_u) in
        [(0_usize, 0_usize, 4_i32), (1, 0, 10), (2, 1, 5), (3, 2, 2)]
    {
        sqlx::query("INSERT INTO rack_placements (id, rack_id, asset_id, start_u, height_u, placed_at, removed_at) VALUES (?, ?, ?, ?, ?, ?, NULL)")
            .bind(id()).bind(&racks[rack_index].0).bind(&assets[asset_index].0).bind(start_u).bind(assets[asset_index].5).bind(&timestamp).execute(&mut *transaction).await
            .map_err(|error| AppErrorDto::database(operation_id, error))?;
    }
    transaction
        .commit()
        .await
        .map_err(|error| AppErrorDto::database(operation_id, error))?;
    Ok(SeedResultDto {
        seeded: true,
        rooms: 1,
        areas: 1,
        racks: 3,
        assets: 5,
        placements: 4,
    })
}
