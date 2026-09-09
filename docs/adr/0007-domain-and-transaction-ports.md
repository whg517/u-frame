# ADR-007：纯领域规则与应用层事务端口

| 属性 | 内容 |
|---|---|
| 状态 | Accepted |
| 日期 | 2026-09-09 |
| 验证范围 | 纯领域层与批量调整位置用例；不是全量 CRUD 仓储化 |

## 背景

Iteration 013 拆分了应用服务文件，但 Domain 仍接收 IPC DTO、返回带 operationId 的接口错误。批量移动同时承担最终布局校验、SQL 和事务编排；仅拆文件没有隔离变化原因。

批量调整必须支持位置互换：先验证最终布局，再在同一事务中结束全部旧放置、插入全部新放置。任何插入或提交失败都不能留下部分调整。

## 决定

1. Domain 仅依赖 Rust 标准库中的纯计算能力，使用领域输入和 RuleViolation；不引用 DTO、serde、specta、Tauri、SQLx，也不做 I/O。错误码和字段详情保留，operationId 由应用层附加。
2. 应用层拥有 LayoutRepository / LayoutTransaction 端口；批量移动服务只依赖端口与 Domain。SQLite adapter 实现端口，负责查询、写入、提交和未提交事务的回滚。
3. 同一事务读取完整活动布局并验证最终投影；先结束全部旧放置，再插入新放置，最后显式提交。只在提交成功后返回成功 DTO。
4. 数据库错误分类放在 infrastructure，不再让 IPC 错误类型依赖 SQLx；不把数据库错误原文返回前端。
5. 使用泛型和关联事务类型进行静态组合，不引入 DI 容器、异步 trait 宏或为所有表生成通用 CRUD 仓储。

依赖方向：Command 调用 Application；Application 使用 Domain 和自己定义的端口；Infrastructure 实现端口。Domain 不依赖 Repository。运行时调用 adapter 不等于源码需要反向依赖。

## 验证与后果

- pnpm domain:check 用 rustc 独立编译运行 Domain 测试，不经过 Cargo/Tauri，结合治理检查阻止框架类型重新进入领域层。
- SQLite 集成测试保留位置互换、越界和重叠测试，新增第二次插入故障：验证旧活动记录及完整历史行数全部恢复。
- pnpm governance:check 禁止批量服务、端口和 IPC 错误模块引用 SQLx/infrastructure。
- 未改变 IPC bindings、数据库 schema、业务功能或用户数据目录；不需要数据迁移操作。
- 普通创建/编辑、单设备上架/移动/下架仍直接使用 SQLx。以后修改这些用例时逐个迁移并保留事务测试，不能把本 ADR 当作“全后端已严格分层”的证明。
- 当前批量校验读取全部活动布局，适用于现有规模；性能优化须先有数据量、延迟和冲突正确性证据。

## 未采用方案

- 仅把 SQL 搬进同层 helper：不能建立端口所有权和可验证边界。
- 一次性重写全部 CRUD：扩大回归风险，不符合当前单维护者项目规模。
- 让 Domain 接收数据库连接或接口错误：混合业务规则、存储和传输变化原因。
- 独立 workspace crate：当前模块数量不需要；独立编译门禁已经能验证依赖隔离，后续可按规模演进。
