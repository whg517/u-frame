# ADR-001：使用 SQLx 访问 SQLite

| 属性 | 内容 |
|---|---|
| 状态 | Accepted |
| 日期 | 2026-09-04 |

## 背景

UFrame 需要在 Tauri Rust Core 中异步访问本地 SQLite，执行内嵌迁移，并以事务保护设备放置规则。前端不得直接访问数据库。

## 决定

采用 SQLx 0.9 SQLite 驱动，使用运行期 `query_as` 和内嵌 migration。数据库位于操作系统应用数据目录，并启用外键、WAL、NORMAL synchronous 和 busy timeout。

## 后果

- Command 可以保持异步，repository 集成测试可使用隔离 SQLite。
- 不需要在构建环境准备数据库或 `DATABASE_URL`。
- SQL 字段与 Rust 行模型需要测试约束；复杂查询仍由 repository 层集中维护。
