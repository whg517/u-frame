# UFrame 技术设计文档

| 属性 | 内容 |
|---|---|
| 文档状态 | Active / Evolving |
| 版本 | v0.6 |
| 更新日期 | 2026-09-04 |
| 适用范围 | UFrame MVP |
| 目标平台 | macOS |
| 关联文档 | [产品需求文档](PRD.md) · [用户故事](USER_STORIES.md) · [开发规范](DEVELOPMENT_GUIDE.md) |

## 1. 文档目的

本文档描述 UFrame MVP 的技术边界、分层架构、数据模型、关键流程、安全约束、测试策略和交付方式。

文档中的状态含义：

- **已采用**：已由产品决策确认，或已经存在于当前项目脚手架。
- **拟采用**：推荐方案，进入实现前仍需通过代码验证。
- **待 ADR**：存在影响长期维护的替代方案，需要单独形成架构决策记录。

## 2. 架构目标与约束

### 2.1 目标

- 单机、单用户、离线可用，不依赖远程服务。
- 机柜画布、设备台账和 U 位占用使用同一份权威数据。
- 所有写操作经过领域校验和 SQLite 事务。
- 数据可以安全备份、校验和恢复。
- 在 500 台机柜、10,000 台设备规模下保持可用。
- 首期交付可签名、可公证的 macOS 安装包。

### 2.2 非目标

- 不设计服务端、多用户、登录、权限和数据同步架构。
- 不接入设备监控、自动发现、SSH 或其他远程执行能力。
- 不设计 Windows、Linux 或移动端兼容层。
- 不提供机柜背面、端口、线缆、电源链路和网络拓扑模型。

## 3. 技术选型状态

| 领域 | 方案 | 状态 | 说明 |
|---|---|---|---|
| 桌面外壳 | Tauri 2 | 已采用 | 当前项目已初始化。 |
| 前端 | React 19 + TypeScript strict | 已采用 | 当前项目已初始化。 |
| 构建 | Vite 7 | 已采用 | 当前项目已初始化。 |
| 包管理 | pnpm 11.10.0 | 已采用 | 由 `packageManager` 固定版本。 |
| Rust | Rust 2024 edition | 已采用 | 当前 Cargo 工程配置。 |
| 本地数据库 | SQLite | 已采用 | 数据文件位于 macOS 应用数据目录。 |
| SQLite 访问 | SQLx 0.9 SQLite | 已采用 | 异步访问与内嵌迁移，见 [ADR-001](adr/0001-sqlx-sqlite.md)。 |
| 前端异步数据 | TanStack Query 5 | 已采用 | 管理 Tauri 查询缓存、失效和写后刷新。 |
| 前端 UI 状态 | React local state | 已采用 | MVP 暂不引入全局状态库；出现跨页面状态后再评估 Zustand。 |
| 表单校验 | React Hook Form + Zod | 已采用 | 前端即时反馈；Rust 后端仍重复校验。 |
| UI 基础 | Tailwind CSS 4 + shadcn Base UI | 已采用 | 使用系统主题和本地组件源码，见 [ADR-003](adr/0003-shadcn-base-ui.md)。 |
| Excel 处理 | Rust 侧解析与生成 | 待 ADR | 解析、字段匹配和正式写入均留在可信后端。 |
| IPC 类型共享 | tauri-specta 生成 TypeScript bindings | 已采用 | RC 版本精确锁定并由门禁检查漂移，见 [ADR-002](adr/0002-tauri-specta-bindings.md)。 |

任何“拟采用”或“待 ADR”条目都不代表依赖已经安装。

## 4. 总体架构

```text
┌─────────────────────────────────────────────────────────┐
│ React WebView                                           │
│ app → features → shared                                 │
│ 页面 / 机柜画布 / 表单 / 查询缓存 / 用户反馈           │
└──────────────────────┬──────────────────────────────────┘
                       │ Tauri IPC：类型化 Command DTO
                       ▼
┌─────────────────────────────────────────────────────────┐
│ Rust Core                                               │
│ Commands → Application Services → Domain → Repositories │
│ 输入校验 / 用例编排 / U 位规则 / 事务 / 错误映射        │
└───────────────┬───────────────────┬─────────────────────┘
                │                   │
                ▼                   ▼
       ┌────────────────┐  ┌────────────────────────┐
       │ SQLite         │  │ 本地文件适配器         │
       │ 业务数据/审计  │  │ Excel/CSV/备份/恢复    │
       └────────────────┘  └────────────────────────┘
```

### 4.1 职责边界

| 层 | 职责 | 禁止事项 |
|---|---|---|
| React UI | 展示、交互、即时校验、调用 feature API | 直接执行 SQL、直接访问任意文件、复制长期业务状态 |
| Feature API | 封装 Tauri `invoke`、查询键、缓存失效和 DTO 转换 | 在组件中散落命令字符串 |
| Tauri Commands | IPC 入口、反序列化、调用应用服务、映射返回值 | 编写 SQL或承载领域规则 |
| Application Services | 编排用例、事务、仓储和审计记录 | 依赖 UI 类型或组件状态 |
| Domain | 设备类型、U 位范围、冲突、状态迁移等纯业务规则 | 文件系统、数据库或 Tauri 依赖 |
| Repositories / Adapters | SQLite、Excel、CSV、备份和系统路径实现 | 绕过应用服务直接暴露给前端 |

### 4.2 权威数据源

- SQLite 是业务实体、当前放置关系和历史记录的唯一权威数据源。
- 机柜画布根据 `racks + assets + rack_placements` 派生，不保存第二份画布坐标。
- TanStack Query 只缓存 Rust 后端返回的数据；不得复制到全局 store 长期维护。
- Excel 是导入来源，不是运行时数据库，也不与正式数据自动双向同步。

## 5. 前端设计

### 5.1 目标目录

```text
src/
├── app/
│   ├── main.tsx
│   ├── provider.tsx
│   └── router.tsx
├── features/
│   ├── locations/
│   ├── racks/
│   ├── assets/
│   ├── rack-view/
│   ├── imports/
│   ├── backups/
│   └── audit/
├── shared/
│   ├── components/
│   ├── lib/
│   │   └── tauri-client/
│   ├── styles/
│   └── types/
└── testing/
```

依赖方向固定为 `app → features → shared`：

- `app` 只负责路由、Provider 和跨 feature 装配。
- 每个 feature 包含自己的页面、组件、表单、查询定义和映射逻辑。
- feature 之间不得直接相互导入；跨领域页面由 `app` 组合。
- `shared` 不得反向依赖 `features` 或 `app`。
- 禁止聚合式 barrel 文件隐藏真实依赖，优先显式路径导入。

### 5.2 Tauri 客户端封装

所有 `invoke` 调用集中在 `shared/lib/tauri-client`，feature 的 `api` 层只调用类型化包装器：

```text
页面组件
  → feature query / mutation
    → typed Tauri client
      → invoke(command, payload)
```

约束：

- Command 名称集中定义，不在组件中使用裸字符串。
- 请求和响应都使用明确 DTO，不返回无约束 JSON。
- Rust 字段统一序列化为 camelCase。
- mutation 成功后只失效相关查询，不执行全局刷新。
- Rust 错误统一转换为前端 `AppError`，UI 按错误码映射中文文案。

### 5.3 状态划分

| 状态 | 所有者 |
|---|---|
| 机房、机柜、设备、放置关系、导入任务 | Rust + SQLite，前端使用 Query 缓存 |
| 当前筛选、搜索词、画布缩放、选中设备 | 页面或 feature 本地状态 |
| 机柜横向展示顺序 | Rust + SQLite `racks.sort_order` |
| 表单草稿与字段错误 | React Hook Form |
| 跨页面持久偏好 | 需求出现后再引入轻量持久化，不预先建立全局 store |

### 5.4 实体详情与路由

- `/locations/rooms/:roomId` 和 `/locations/areas/:areaId` 展示物理位置层级、汇总值和下级对象。
- `/racks/:rackId` 展示机柜静态属性、实时容量投影和活动设备列表。
- `/assets/:assetId` 展示完整设备字段、当前放置和关联实体入口。
- 详情页优先复用 `list_locations`、`list_racks`、`list_assets` 和 `get_rack_view` 的现有投影；当前数据规模下不增加仅返回同样字段的重复 IPC。
- 跨 feature 的通用设备类型与状态标签位于 `shared/lib`，避免 feature 之间直接依赖。
- 列表、机柜详情和画布设备侧栏提供稳定深链；无效或已归档 ID 显示可恢复的未找到状态。

### 5.5 机柜画布实现

- 每个机柜使用固定 U 高度比例，顶部为最大 U，底部为 U1。
- 画布背景使用两层 CSS 线性渐变绘制低对比度方格，网格尺寸与当前缩放比例同步。
- 缩放范围固定为 50%–160%，由页面本地状态管理；缩放不写入数据库。
- 设备块位置由 `startU` 和 `heightU` 计算，不保存像素坐标。
- 多机柜采用横向或二维虚拟化；只渲染可视区域和少量缓冲区。
- 设备选中后打开详情侧栏；上架和移动通过表单完成，不实现设备拖拽。
- 机柜标题作为拖动手柄，前端乐观更新顺序，保存失败回滚；同时提供左右方向键操作。
- 前端只提交当前画布内完整的机柜 ID 顺序；后端在事务中将该顺序写入当前全局顺序槽，保留筛选范围外机柜的相对顺序。
- 机柜和设备在同一 DOM 树中整体缩放，确保 U 位刻度与设备块不会产生比例漂移。

## 6. Rust 后端设计

### 6.1 目标目录

```text
src-tauri/
├── migrations/
├── src/
│   ├── commands/
│   ├── application/
│   ├── domain/
│   │   ├── entities/
│   │   ├── value_objects/
│   │   └── errors.rs
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── excel/
│   │   ├── backup/
│   │   └── clock.rs
│   ├── dto/
│   ├── state.rs
│   └── lib.rs
└── capabilities/
```

### 6.2 应用状态

应用启动时完成以下动作：

1. 解析操作系统应用数据目录。
2. 创建数据库目录，禁止把数据库放在源码或当前工作目录。
3. 打开 SQLite 连接池并启用外键。
4. 执行内嵌迁移；迁移失败则停止进入主界面并展示可恢复错误。
5. 将数据库、日志器和应用服务注册为 Tauri managed state。

SQLite 建议配置：

- `PRAGMA foreign_keys = ON`
- `PRAGMA journal_mode = WAL`
- `PRAGMA synchronous = NORMAL`
- 合理的 `busy_timeout`，避免短暂写锁直接变成用户错误

### 6.3 Command 分组

| 模块 | 主要 Commands |
|---|---|
| locations | `list_locations`、`create_room`、`create_area`、`update_location`、`archive_location` |
| racks | `list_racks`、`get_rack_view`、`create_rack`、`reorder_racks`、`update_rack`、`archive_rack` |
| assets | `list_assets`、`get_asset`、`create_asset`、`update_asset`、`archive_asset` |
| placements | `place_asset`、`move_asset`、`unmount_asset` |
| imports | `preview_asset_import`、`apply_asset_import`、`get_import_job` |
| exports | `export_assets` |
| backups | `create_backup`、`inspect_backup`、`restore_backup` |
| audit | `list_audit_logs` |

Command 只接受 DTO 并返回 `Result<T, AppErrorDto>`。Tauri Command 可以是异步函数，因此数据库和较长文件操作不应阻塞 WebView 交互线程。

### 6.4 错误契约

```text
AppErrorDto
  code: string
  message: string
  details?: object
  operationId: string
```

- `code` 是稳定机器码，例如 `Placement.Overlap`、`Rack.OutOfRange`。
- `message` 用于本地日志和诊断，不直接展示给用户。
- `details` 只包含安全、结构化、可用于表单定位的信息。
- `operationId` 关联一次 Command、日志和用户反馈。
- 不向前端返回 Rust 堆栈、SQL、数据库路径或原始文件内容。

## 7. 数据设计

### 7.1 实体关系

```text
rooms 1 ── n areas 1 ── n racks 1 ── n rack_placements n ── 1 assets
                                      │
                                      └── 当前放置 + 历史放置

import_jobs 1 ── n import_rows
audit_logs ── 记录业务实体变更
```

机房和区域使用独立表，不采用可无限嵌套的通用树，以便数据库直接表达层级约束。

### 7.2 核心表草案

#### `rooms`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | TEXT | UUID，主键 |
| code | TEXT | 非空，唯一 |
| name | TEXT | 非空 |
| description | TEXT | 可空 |
| status | TEXT | `active` / `archived` |
| created_at / updated_at | TEXT | UTC RFC 3339 |

#### `areas`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | TEXT | UUID，主键 |
| room_id | TEXT | 外键 → rooms.id |
| code | TEXT | 非空 |
| name | TEXT | 非空 |
| description | TEXT | 可空 |
| status | TEXT | `active` / `archived` |
| created_at / updated_at | TEXT | UTC RFC 3339 |

唯一约束：`UNIQUE(room_id, code)` 和 `UNIQUE(room_id, name)`。

#### `racks`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | TEXT | UUID，主键 |
| area_id | TEXT | 外键 → areas.id |
| code | TEXT | 非空 |
| specification | TEXT | 例如 `42U` 或 `custom` |
| total_u | INTEGER | 1–100 |
| power_capacity_w | INTEGER | 可空，非负 |
| status | TEXT | `active` / `archived` |
| notes | TEXT | 可空 |
| sort_order | INTEGER | 非空，机柜画布展示顺序 |
| created_at / updated_at | TEXT | UTC RFC 3339 |

唯一约束：`UNIQUE(area_id, code)`。

#### `assets`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | TEXT | UUID，主键 |
| type | TEXT | `server` / `switch` / `router` / `firewall` |
| name | TEXT | 非空 |
| hostname | TEXT | 可空，非空时唯一 |
| intranet_ip | TEXT | 可空，非空时唯一 |
| management_ip | TEXT | 可空 |
| serial_number | TEXT | 可空，非空时唯一 |
| vendor / model | TEXT | 可空 |
| purpose | TEXT | 可空 |
| height_u | INTEGER | 非空，默认 1，必须大于 0 |
| status | TEXT | `active` / `maintenance` / `offline` / `archived` |
| notes | TEXT | 可空 |
| created_at / updated_at | TEXT | UTC RFC 3339 |

#### `rack_placements`

| 字段 | 类型 | 约束 |
|---|---|---|
| id | TEXT | UUID，主键 |
| rack_id | TEXT | 外键 → racks.id |
| asset_id | TEXT | 外键 → assets.id |
| start_u | INTEGER | 最低占用 U，必须大于 0 |
| height_u | INTEGER | 放置时的高度快照，必须大于 0 |
| placed_at | TEXT | UTC RFC 3339 |
| removed_at | TEXT | 当前放置为空，历史放置非空 |

`height_u` 同时保存在设备和历史放置中：设备字段表达当前物理规格，放置快照保证规格修改后仍能解释历史记录。

#### 导入与审计

```text
import_jobs
  id, source_name, file_hash, status, summary_json,
  created_at, applied_at

import_rows
  id, job_id, row_number, raw_json, normalized_json,
  match_type, matched_asset_id, diff_type, errors_json, selected

audit_logs
  id, operation_id, action, entity_type, entity_id,
  before_json, after_json, created_at
```

### 7.3 完整性约束

- 一台设备最多存在一个 `removed_at IS NULL` 的放置记录，使用部分唯一索引保障。
- 放置范围为 `[start_u, start_u + height_u - 1]`。
- 应用层先校验越界和重叠，用于给出友好错误。
- 数据库事务内再次校验；推荐增加 INSERT/UPDATE trigger，阻止绕过应用服务的越界或重叠写入。
- 归档使用状态字段，不物理删除资产和放置历史。
- 正式业务表不保存 Excel 原始行；原始导入内容只进入 staging 表。

重叠判定：

```text
existing.start_u <= new.end_u
AND existing.end_u >= new.start_u
AND existing.removed_at IS NULL
```

## 8. 关键事务流程

### 8.1 设备上架或移动

```text
BEGIN IMMEDIATE
  → 读取设备、目标机柜和当前放置
  → 校验实体状态、U 位范围和高度
  → 校验目标范围无重叠
  → 关闭旧放置记录（移动时）
  → 新增当前放置记录
  → 写入 audit_logs
COMMIT
```

任何一步失败都回滚。移动操作不能拆成“先下架、后上架”两个独立事务，否则中间失败会丢失原位置。

### 8.2 Excel 导入

```text
选择文件
  → Rust 读取并计算文件摘要
  → 解析、规范化、字段校验
  → 按 SN / 主机名 / 内网 IP 匹配
  → 保存 import_job 和 import_rows
  → 前端展示新增 / 修改 / 缺失 / 冲突 / 无法匹配
  → 用户选择并确认
  → 单事务应用正式数据和审计记录
  → 重新读取正式数据并返回复核摘要
```

规则：

- 预览阶段不修改正式数据。
- 不把分组标题行当作设备。
- 匹配键矛盾时标记冲突，不自动选择其中一个结果。
- 不确定的 U 高度、型号或硬件参数保持为空，不推测填充。
- 大文件解析通过异步 Command 执行；需要进度时使用 Tauri Channel，而不是高频全局事件。

### 8.3 备份与恢复

备份文件建议使用 `.uframe-backup` 扩展名，内容包含：

- 一致性 SQLite 快照
- `manifest.json`：应用版本、schema 版本、创建时间、文件摘要
- 必要的本地配置；不得包含缓存、日志或临时导入文件

备份使用 SQLite Online Backup API 或 `VACUUM INTO` 创建一致快照，不在数据库写入期间直接复制 `.db` 文件。

恢复流程：

1. 读取 manifest 并校验文件摘要和兼容版本。
2. 对备份数据库执行 `PRAGMA integrity_check`。
3. 自动创建当前数据的恢复前安全备份。
4. 停止写入并关闭现有数据库连接。
5. 原子替换数据库文件，重新连接并执行兼容迁移。
6. 重新读取核心数据并展示恢复摘要。

## 9. 安全设计

### 9.1 信任边界

React WebView 输入、Excel 内容、备份文件和用户选择的路径均视为不可信。Tauri IPC 是 WebView 与具备系统权限的 Rust Core 之间的信任边界。

- 每个 Command 在 Rust 侧重新校验输入，前端校验不能作为安全边界。
- 数据库、文件系统和系统 API 只能由 Rust adapter 访问。
- 不提供 shell 执行、任意 SQL、任意路径读写 Command。
- 用户选择文件后仍需规范化路径、限制扩展名、限制大小并检查文件类型。

### 9.2 Tauri 能力最小化

- Capability 仅绑定 `main` 窗口和 macOS。
- 只启用实际需要的 dialog、文件读取或保存权限，并限制路径范围。
- 当前脚手架启用了 `opener:default`，业务不需要时应在 M1 前移除。
- 当前 `csp` 为 `null`，M1 前必须设置仅允许本地资源的 CSP。
- 不加载远程页面，不向远程 origin 暴露本地 Command。

### 9.3 数据保护

- MVP 不保存远程设备密码、SSH Key 或 API Token。
- 日志避免记录完整资产导入行、敏感备注和本地绝对路径。
- SQLite 文件、备份和日志使用操作系统应用数据目录或用户明确选择的位置。
- 恢复属于破坏性操作，必须明确确认并先创建恢复前备份。

## 10. 性能设计

| 场景 | 设计措施 |
|---|---|
| 设备搜索 | 为 hostname、intranet_ip、serial_number、type、status 建索引；输入防抖 |
| 机柜一览 | 按区域一次读取必要投影，避免每个机柜单独查询 |
| 100 台机柜画布 | 可视区域虚拟化、轻量网格背景、设备块按范围渲染 |
| 导入 10,000 行 | Rust 后台解析、批量校验、事务批量写入、按需报告进度 |
| 审计记录增长 | 按时间和实体建立索引，列表游标或分页查询 |

禁止在 React 渲染过程中重复执行全量占用计算。Rust 返回标准化放置数据，前端使用纯函数按机柜建立索引，并只在输入数据变化时重新计算。

## 11. 测试与质量门禁

### 11.1 Rust

- Domain 单元测试：U 位边界、范围重叠、设备状态和机柜状态。
- Repository 集成测试：临时 SQLite、迁移、唯一索引、trigger 和事务回滚。
- Application 测试：创建、移动、下架、归档、导入应用和恢复编排。
- Command 契约测试：DTO 序列化、错误码和输入拒绝。

### 11.2 React

- Vitest：U 位坐标、画布布局、DTO 映射和表单 schema。
- Testing Library：按用户可见行为测试列表、表单、错误和空状态。
- Tauri IPC 使用集中 mock adapter；未声明的 Command 调用直接使测试失败。
- 不断言组件内部 state，不使用真实 sleep 等待异步结果。

### 11.3 关键验收

- 42U 与其他常见规格的刻度及设备位置一致。
- 越界和重叠在 UI 与数据库层均被拒绝。
- 移动失败时原放置保持不变。
- 导入预览不会修改正式数据，应用后复核数量一致。
- 备份恢复后实体数量、当前放置和 schema 版本一致。
- macOS 打包产物可启动、可创建数据库、可导入和备份。

### 11.4 建议门禁

```text
pnpm gate
```

当前 `pnpm gate` 执行 Git 空白检查、Shell 语法检查、文档检查、bindings 漂移检查、前端 ESLint、TypeScript、Vitest 与构建，以及 Rust 格式、Debug/Release Clippy 和全量测试。远程 CI 尚未配置。DMG 构建属于发布门禁，不在每次提交时执行。

## 12. 日志与审计

技术日志和业务审计分开：

- 技术日志用于诊断启动、迁移、数据库和文件错误，按大小轮转。
- `audit_logs` 是用户可查看的业务变更记录，不依赖文本日志重建。
- 每次写 Command 创建 `operationId`，贯穿应用服务、技术日志、错误响应和审计记录。
- 日志级别至少包含 error、warn、info；生产环境默认不记录 SQL 参数和导入原文。

## 13. macOS 构建与发布

开发阶段：

```bash
pnpm install
pnpm tauri dev
```

发布阶段：

```bash
pnpm install --frozen-lockfile
pnpm tauri build --bundles dmg
```

正式对外分发前需要完成：

- 设置真实应用描述、作者、版权和图标。
- 使用 Developer ID Application 证书签名。
- 完成 Apple notarization，并验证 DMG 安装和首次启动。
- 分别构建和验证 Apple Silicon 与 Intel 产物，或形成 Universal Binary 决策。
- 发布前执行全量数据迁移、导入、备份与恢复回归测试。

## 14. 实施顺序

1. 已建立目标目录、错误类型和类型化 Tauri client 边界。
2. 已采用 SQLx，加入应用数据目录数据库初始化和内嵌迁移。
3. 已实现机房、区域、机柜和设备的创建、列表与独立详情主链路；编辑和归档留待 Slice 2。
4. 已实现首次上架领域规则和数据库约束；移动、下架事务留待 Slice 2。
5. 已实现网格多机柜画布、50%–160% 缩放、机柜顺序持久化和设备详情交互；虚拟化留待后续切片。
6. 实现导入 staging、差异预览、确认应用和导出。
7. 实现审计、备份、恢复和迁移兼容测试。
8. 配置质量门禁、macOS 签名、公证和安装验证。

## 15. ADR 待办

| ADR | 决策问题 | 候选方案 | 完成阶段 |
|---|---|---|---|
| ADR-003 | 一致性备份实现 | SQLite Backup API / `VACUUM INTO` | M4 开始前 |
| ADR-004 | Excel 解析和生成库 | Rust 生态候选库实测比较 | M3 开始前 |
| ADR-005 | macOS 架构产物 | 双架构独立 DMG / Universal Binary | 发布前 |

## 16. 当前脚手架差距

Iteration 001 已移除默认示例并建立 SQLite、类型化 IPC、分层目录、最小权限、前端 lint/测试和 Rust 测试。后续差距包括：

- 编辑、归档、移动、下架、审计和历史查询尚未实现。
- 可视区域虚拟化及 100 台机柜性能验证尚未实现。
- Excel、导出、备份和恢复适配器尚未实现。
- 远程 CI、签名、公证和安装包发布门禁尚未建立。

## 17. 参考资料

- [Tauri：从前端调用 Rust](https://v2.tauri.app/develop/calling-rust/)
- [Tauri：Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri：安全模型](https://v2.tauri.app/security/)
- [SQLx：SQLite 驱动](https://docs.rs/sqlx/latest/sqlx/sqlite/)
- [SQLx：内嵌迁移](https://docs.rs/sqlx/latest/sqlx/macro.migrate.html)
- [SQLite：Online Backup API](https://www.sqlite.org/backup.html)
- [SQLite：VACUUM INTO](https://www.sqlite.org/lang_vacuum.html)
- [Tauri：macOS 签名与公证](https://v2.tauri.app/distribute/sign/macos/)

## 18. 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v0.1 | 2026-09-04 | 建立 MVP 技术架构、数据模型、关键流程、安全与交付基线。 |
| v0.2 | 2026-09-04 | 建立与用户故事文档的双向关联。 |
| v0.3 | 2026-09-04 | 接入 worktree、提交门禁和 squash 合并开发规范。 |
| v0.4 | 2026-09-04 | 记录 Iteration 001 已采用的 SQLx、tauri-specta、前端 UI/状态方案及当前实现差距。 |
| v0.5 | 2026-09-04 | 记录网格画布、缩放边界、机柜排序事务、`sort_order` 迁移及 `reorder_racks` IPC。 |
| v0.6 | 2026-09-04 | 记录位置、机柜和资产详情路由、现有查询投影复用及跨实体深链。 |
