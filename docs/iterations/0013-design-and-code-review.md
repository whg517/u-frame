# Iteration 013：设计与代码评审及可靠性优化

| 属性 | 内容 |
|---|---|
| 状态 | Implemented / Locally verified |
| 日期 | 2026-09-09 |
| 基线 | `0df39c4`（Iteration 012） |
| 分支 | `refactor/design-review` |
| 关联故事 | US-FLOW-001、US-FLOW-002、US-SET-002 |

## 1. 评审结论

产品边界合理：本地单用户、位置与资产台账、以 U 位为核心的机柜画布。SQLite 作为业务真相源，前端派生画布、Rust 重验并以事务和 trigger 保护放置规则，均应保留。本轮不更换技术栈，不扩展备份、数据迁移、恢复或自定义数据库位置。

主要问题不是缺少框架，而是可靠性约定未落实到实现、架构边界只靠文档，以及文档把部分目标写成了现状。优先修复真实操作中断和输入丢失，再降低代码耦合；未完成的用户故事和性能目标继续明确列为待交付。

## 2. 已处理发现

| 优先级 | 基线证据与影响 | 调整 |
|---|---|---|
| P1 | `app/provider.tsx` 未配置网络模式；TanStack 默认 online 会在离线时暂停本地 IPC 查询和保存 | 集中 `app/query-client.ts`，queries/mutations 使用 always，关闭自动重试；测试模拟 offline 读写 |
| P1 | 四类编辑页在查询对象变化时 `form.reset`，后台重新获取会覆盖草稿 | `shared/forms/use-entity-form.ts` 按实体初始化一次；创建页预选也尊重已修改字段 |
| P2 | 资产 IP 正则只检查字符集合，允许无效 IPv4/IPv6 | 使用已有 Zod 地址校验器，保留 Rust 独立校验 |
| P2 | 默认参数直接读取 `window.localStorage`，获取属性时的异常不在 try 内 | 将存储获取纳入容错，Provider 惰性初始化；拒绝存储时仅内存生效 |
| P2 | 多个 Rust 稳定错误码无解释，普通异常直接显示 message | 补充中英文业务错误映射，未知业务错误保留 operationId，普通异常不显示内部细节 |
| P2 | 所有页面静态导入；页面异常/未知 URL 缺少应用内返回入口 | 按路由分包，增加加载、404 和错误边界；普通页面异常时保留导航 |
| P2 | assets、racks、rack-view 直接导入其他 feature 的查询 | 共享查询移至 `shared/queries`，ESLint 自动拒绝跨 feature 和反向依赖 |
| P2 | Rust `application/mod.rs` 2,276 行，混合所有用例、映射和测试 | 拆分 locations、racks、assets、placements、rack_view、mapping、seed、tests，公开 API 与事务不变 |
| P2 | SQLite 路径字符串插入 URL，文件名中的 `?`/`#` 可能被解释为连接参数 | 使用 `SqliteConnectOptions::filename`；临时数据库测试覆盖中文及保留字符、关闭重开 |
| P2 | 技术文档仍称 opener 已启用、CSP 为 null，并将虚拟化写成现状 | 对照权限和 CSP 配置校正，区分目标措施与实际交付 |

优先级表示本轮工程排序，不代表外部安全评级。没有观察到现有业务库损坏，也未通过修改用户库复现故障。

## 3. 架构调整与限制

- React 依赖方向仍为 `app → features → shared`。跨领域查询只有一个定义，业务数据仍只保留在查询缓存；未增加全局业务 store。
- ESLint 规则检查生产代码的别名、相对路径、再导出和动态导入；跨 feature 集成测试允许在 `testing` 中装配。
- Rust Command 继续调用原应用 API；Application 调用纯规则和持久化操作，而不是 Domain 调用 Repository。
- 用例文件拆分是内聚性改进，不等于完全实现 Clean Architecture：部分 SQL 仍位于 Application，Domain 仍依赖 DTO/错误类型。
- 无 schema、IPC 契约和依赖版本变更；bindings 检查继续作为独立门禁。

## 4. 后续风险与建议顺序

| 顺序 | 未处理问题 | 下一步边界 |
|---|---|---|
| 1 | 表单或画布草稿离开页面时没有统一的未保存确认 | 统一站内导航与窗口关闭策略，覆盖保存失败、取消和再次进入；不能只加 beforeunload |
| 2 | LOC-003 要求机房名唯一，现有 rooms 只约束 code，areas 同时约束 code/name | 先确认已有同名数据如何处理；不得自动重命名或删除。后续用向前 schema 变更和稳定错误码闭合规则 |
| 3 | 数据库初始化失败通过 Tauri setup 返回错误并退出，缺少用户可操作反馈 | 提供启动失败界面/诊断编号，不增加备份恢复入口，也不删除数据库重试 |
| 4 | 领域规则引用 DTO/错误类型，Application 承担 SQL；画布页面仍较大 | 随下一次对应业务变更逐用例提取仓储和领域类型，保留事务测试，避免一次性重写 |
| 5 | 列表客户端全量过滤、画布未虚拟化；500 机柜/10,000 设备目标未测 | 先建立可复现基准，再决定分页、投影范围和虚拟化；不凭包体积判断运行时性能 |

归档、审计/历史查询和 Excel 导入导出仍是产品待交付项，不因本轮评审而宣称完成。评审不包含渗透测试、Apple 签名公证或发布验收。

## 5. 验证记录

- 回归测试覆盖断网的本地查询与写入、四类表单后台刷新保留输入、编辑对象切换/创建重置、无效 IP、存储属性访问被拒绝、业务错误本地化与异常脱敏、路由错误恢复及依赖边界拒绝。
- Rust 原用例和事务测试完整保留；新增带中文、`#`、`?` 字符的真实数据库路径与重开持久化测试。
- 按函数提取与基线比较：24 个原应用层函数去除格式空白和映射函数可见性差异后完全一致，原应用层测试正文也保持一致。
- 生产前端入口 JS 从 728.84 KB（gzip 231.43 KB）降至 511.23 KB（gzip 166.98 KB），约减少 30%；表单模块按需加载。Vite 的 500 KB 体积警告仍存在，未调高阈值掩盖警告。未测启动耗时，不将此指标等同于运行速度提升。
- 桌面使用独立 `com.whg517.uframe.review` 标识的 Debug app，应用名 `UFrame Review`；业务数据库和偏好与日常 UFrame 隔离。产物、测试库和截图不提交 Git。
- 完整 `pnpm gate` 通过文档检查（30 文件、64 需求、35 用户故事）、版本与 bindings 一致性、ESLint、TypeScript、Vitest、生产构建、Rust format、Debug/Release Clippy `-D warnings` 和 Rust 18 项测试。前端共 25 个测试文件，补充父级选择与有效 IPv6 场景后共 78 项；提交钩子再次执行全量门禁。
- 实际 macOS Debug app 检查通过：五个一级页面加载；空库不自动填充；创建机房 → 列表 → 详情 → 编辑 → 保存返回；退出并重启后名称和描述仍在；资产表单拒绝 `999.1.1.1`。画布空态、资产校验和重启后详情均已截图查看，页头/侧栏分割线保持对齐。
- 桌面检查未覆盖全量 U 位拖动回归、所有主题组合或真实系统断网；这些本轮分别沿用事务/几何测试、既有设置测试以及 Query onlineManager 离线模拟，不将其标记为新增的桌面验收。
- 通过功能分支提交、远程 quality-gate 和 squash 流程交付；具体提交和远程 CI 结果由对应 PR 记录，主线同步后再次执行本地门禁。

## 6. 参考与依据

- [TanStack Query Network Mode](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)：本地 Promise 不应依赖 online 状态。
- [React Router Error Boundaries](https://reactrouter.com/how-to/error-boundary)：按路由提供可恢复的错误界面。
- [SQLx SQLiteConnectOptions](https://docs.rs/sqlx/latest/sqlx/sqlite/struct.SqliteConnectOptions.html)：直接配置文件路径，避免 URI 字符解析。
- [产品需求](../PRD.md)、[用户故事](../USER_STORIES.md)、[技术设计](../TECHNICAL_DESIGN.md)：范围、验收和实现边界的真相源。
