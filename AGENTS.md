# UFrame 项目协作指南

本文件适用于整个仓库。后续 Agent 在分析、修改、测试和交付本项目时必须遵守以下约定。

## 1. 项目定位

UFrame 是一个面向 macOS、Windows 和 Linux 的本地桌面机柜与物理设备资产管理工具。

MVP 的核心闭环：

```text
建立机房和区域
  → 创建机柜
    → 创建设备
      → 通过表单首次分配 U 位
        → 在多机柜画布中核对和调整位置
```

MVP 管理四类设备：

- 服务器
- 交换机
- 路由器
- 防火墙

产品是本机、单用户、离线优先工具。未经明确需求，不得扩展为服务端系统、多用户系统或自动运维平台。

## 2. 当前项目状态

- Iteration 001 已交付创建位置、机柜、设备、设备上架与多机柜查看的行走骨架。
- Tauri 2、React 19、TypeScript strict、Vite 7、pnpm、SQLite、SQLx、TanStack Query、React Hook Form、Zod、Vitest 和 ESLint 已实际采用。
- Tauri IPC bindings 由 tauri-specta 生成并纳入门禁；应用启动时执行内嵌 SQLite migration。
- 机柜一览已具备网格画布、缩放和机柜顺序持久化；未上架设备通过表单首次上架，已上架设备可在画布中拖动调整，并通过编辑模式统一确认保存。
- 机房、区域、机柜和设备已具备详情与编辑路径；机柜一览支持机房、区域的全部、多选和联动筛选。
- Iteration 005 已将画布、详情、列表和表单组成连续任务：支持安全返回原上下文、已知父级预选、详情后续动作、整行导航和 URL 搜索筛选。
- 设备已支持原子移动和保留历史放置行的下架；上架/移动页可查看连续空闲 U 位和具体冲突对象。
- CSP 已限制为本地资源与 Tauri IPC，默认 opener 权限已移除。
- GitHub CI、协作模板、Dependabot 与四平台安装包发布流程已建立；macOS arm64、Windows amd64、Linux amd64/arm64 通过 GitHub Release 分发，dev 预发行与正式 Draft 分开，详见 ADR-008。
- 设置页已支持系统/浅色/深色外观、五种主题色、简体中文/英语全局切换、默认画布缩放、三档界面密度与字号、默认启动页面、即时本地持久化和恢复默认。
- Excel 导入导出和完整审计尚未接入；产品明确不提供数据备份、迁移或恢复功能。

技术设计中的“拟采用”和“待 ADR”均为方案，不代表已经安装或落地。实现前应检查当前代码和锁文件。

## 3. 文档真相源

开始工作前，按任务范围阅读以下文档：

1. [产品需求文档](docs/PRD.md)：定义产品范围、功能需求、非目标和验收场景。
2. [用户故事](docs/USER_STORIES.md)：定义迭代故事、依赖和 Given/When/Then 验收标准。
3. [技术设计文档](docs/TECHNICAL_DESIGN.md)：定义架构方案、数据设计、安全、测试和 ADR 待办。
4. [开发规范](docs/DEVELOPMENT_GUIDE.md)：定义 worktree、提交门禁、PR 和 squash 合并流程。
5. [GitHub 项目治理](docs/GITHUB_GOVERNANCE.md)：定义远程仓库、流水线、保护规则和 workflow 安全边界。
6. [发布规范](docs/RELEASING.md)：定义版本、tag、四平台构建、dev 预发行与 Release 验收。
7. [仓库治理规范](docs/REPOSITORY_GOVERNANCE.md)：定义根文件清单、架构边界和可执行治理控制；完整索引见 [docs](docs/README.md)。

发生冲突时：

- 用户最新明确指示优先。
- 产品行为以 PRD 和用户故事为准。
- 实现方式以已确认的技术设计或 ADR 为准。
- 技术文档中的 Proposed 方案不得反向改变产品范围。

不要根据文档标题或旧摘要推断当前状态；直接检查文档版本、源码和配置。

## 4. MVP 范围边界

除非用户明确改变范围，否则不得实现：

- Ping、SNMP、IPMI、Redfish 等自动监控或发现。
- SSH、远程开关机、批量执行或其他远程运维。
- 登录、多用户、权限、审批或远程服务端。
- CMDB、钉钉或其他平台的实时同步。
- Intel Mac、Windows arm64、32 位或移动端适配。
- 机柜背面视图。
- 将未上架设备从台账拖入机柜。
- 端口、线缆、配线架、电源链路或网络拓扑。
- 告警、容量预测或能耗分析。
- 数据备份、跨安装或跨目录迁移、数据恢复，以及用户自定义业务数据库位置。

本地 Excel 导入导出属于 MVP；外部平台同步不属于 MVP。

## 5. 仓库结构

当前主要目录：

```text
.
├── .github/             # Actions、Dependabot 和协作模板
├── docs/
├── scripts/             # 门禁、版本和发布校验
├── src/                 # React 前端，按 app / features / shared 分层
├── src-tauri/           # Rust/Tauri 应用
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

前端目标结构：

```text
src/
├── app/                 # 装配、Provider、路由
├── features/            # 按业务领域组织
│   ├── locations/
│   ├── racks/
│   ├── assets/
│   ├── rack-view/
│   ├── imports/
│   └── audit/
├── shared/              # 跨领域 UI、工具、类型、Tauri client
└── testing/             # 共用测试基础设施
```

Rust 目标结构：

```text
src-tauri/src/
├── commands/            # IPC 入口
├── application/         # 用例和事务编排
├── domain/              # 纯领域规则
├── infrastructure/      # SQLite、Excel 等 adapter
├── dto/                 # IPC DTO
├── state.rs
└── lib.rs
```

只在实现相关功能时创建目标目录，不为空结构提前生成大量占位文件。

## 6. 架构边界

### 6.1 React

依赖方向固定为：

```text
app → features → shared
```

- `app` 只负责路由、Provider 和跨 feature 装配。
- feature 之间不得直接相互导入；跨 feature 组合放在 `app`。
- 多个 feature 共用的实体查询位于 `shared/queries`；ESLint 检查别名、相对路径和动态导入的依赖方向。
- `shared` 不得导入 `features` 或 `app`。
- 组件不得直接调用裸 `invoke`；Tauri 调用集中在 typed client 和 feature API 层。
- 后端返回的业务数据只作为查询缓存，不得复制到全局 store 形成第二份真相。
- 本地 IPC 查询和写操作必须使用 `networkMode: "always"`，不能依赖浏览器联网状态。
- 编辑表单按实体 ID 初始化一次；后台重新查询不得覆盖未保存输入，创建页的上下文预选不得覆盖用户主动选择。
- TypeScript 保持 `strict`，不得通过关闭严格检查解决类型错误。
- 避免无业务价值的 barrel 文件，优先显式路径导入。

### 6.2 Rust

调用方向固定为：

```text
Tauri Command
  → Application Service
    → Domain（纯规则）
    → Repository / Adapter（持久化）
```

- Command 只负责 DTO、入口校验、调用应用服务和错误映射。
- Application Service 负责用例、事务和审计编排。
- 批量移动通过应用层自有的事务端口调用 SQLite adapter；普通 CRUD 和单设备放置仍保留应用层 SQL，不得宣称全后端已完成仓储化。
- Domain 规则必须是可独立编译测试的纯 Rust 逻辑，不依赖 IPC DTO、接口错误、Tauri、SQL 或文件系统；operationId 在应用层附加。
- Repository/Adapter 负责 SQLite、Excel、CSV 和必要的系统路径。
- 前端不得直接访问 SQLite、任意文件或本地命令。
- 所有 IPC 输入在 Rust 侧重新校验；前端校验只用于用户体验。

## 7. 核心领域规则

实现或修改机柜、设备和放置逻辑时必须保持以下不变量：

- 机柜提供 18U、22U、27U、32U、37U、42U、45U、47U 常见规格，并允许自定义总 U 数。
- 设备占用高度默认为 1U，且必须大于 0。
- `startU` 是设备占用的最低 U 位。
- 占用范围为 `[startU, startU + heightU - 1]`。
- 占用范围不得低于 U1 或超过机柜总 U 数。
- 同一机柜的活动放置范围不得重叠。
- 一台设备最多只有一条活动放置记录。
- 移动必须是单一原子事务；失败时保留原位置。
- 机柜缩容会导致现有设备越界时必须拒绝保存。
- 设备下架释放当前 U 位，但保留历史放置记录。
- 设备归档释放当前 U 位并保留历史；归档前必须确认。
- 有活动机柜的区域或机房不得归档。
- 有活动设备的机柜不得归档。
- 已归档实体不得接受新下级对象或新放置。

领域规则既要在应用层提供友好错误，也要在数据库事务边界保护数据完整性。不能只依赖前端禁用按钮。

## 8. 机柜画布约束

- 第一视图是纯机柜画布，不添加与机柜无关的外部内容。
- 画布可以同时显示多个简洁线框机柜。
- 每个机柜顶部显示最大 U，底部显示 U1。
- 设备块按 `startU` 和 `heightU` 派生，不保存像素坐标。
- 空闲和占用必须易于区分，设备边界必须与 U 位刻度对齐。
- 详情通过选中态或侧栏展示，不在设备正面堆叠大量字段。
- 未上架设备通过表单首次上架；已上架设备可在画布中拖动调整，并通过编辑模式统一保存。
- 机柜标题可以作为拖动手柄调整横向画布顺序；顺序必须写入 SQLite，不能只保存在前端。
- 画布支持 50%–160% 缩放，背景网格和机柜使用同一缩放比例。
- 不建立背面、安装面或双面占用模型。

用户可见文案默认使用中文；设置允许切换为英语。代码标识符、数据库字段和稳定错误码使用英文。
正式界面不显示 `Physical assets`、`Rack detail` 等原型阶段的英文页面分类注释；产品品牌、设备型号、IP、SN 和 U 位等业务术语不受此限制。

## 9. 设置与国际化约束

- 外观、主题色、语言、默认画布缩放、界面密度、字号和默认启动页面属于本机 UI 偏好，使用带版本且逐字段校验的轻量存储，不得写入业务 SQLite。
- 默认值固定为跟随系统外观、中性灰主题色、简体中文、100% 画布缩放、标准密度、标准字号和机柜一览启动页；读取失败不能阻止应用启动。
- 主题组件只使用语义 CSS token，不在业务页面散落主题专属颜色。
- 正式用户文案、表单校验、错误映射、提示和无障碍标签必须经过共享国际化入口，不得只翻译设置页或固定导航。
- 新增中文消息键时必须同时补充英语资源；用户输入和资产字段原值不得自动翻译。
- 设置更改立即保存；外观、语言、密度和字号立即生效，默认启动页面在下次启动生效。启动偏好只能重写无参数根路径，不得覆盖详情深链或筛选上下文；密度和字号必须通过根节点语义 token 全局应用，不能在页面内逐个硬编码；机柜一览以默认画布缩放初始化，画布重置操作也回到该值；恢复默认不得修改业务数据。

## 10. 导入与导出

### 10.1 Excel 导入

固定流程：

```text
选择文件
  → 解析暂存
  → 字段校验
  → 差异预览
  → 用户确认
  → 事务写入
  → 重新读取并复核
```

- 预览阶段不得修改正式数据。
- 默认使用 SN、主机名和内网 IP 作为匹配线索。
- 匹配键矛盾时必须标记冲突，不能自动任选一个结果。
- 标题行、分组行和空行不能当作设备。
- 不确定的型号、U 高度或硬件字段不得猜测。
- Excel 中缺失的本地设备默认只标记缺失，不自动归档或删除。
- 应用导入必须是单一事务；失败时全部回滚。
- 成功后重新读取正式数据并展示新增、修改、跳过和失败摘要。

### 10.2 导出

- 导出前明确范围：全部设备或当前筛选结果。
- 至少包含核心资产字段和当前机房、区域、机柜、U 位。
- 保存失败不得留下看似成功的完整文件。

## 11. 安全约束

- React WebView、Excel 文件和用户提供的路径均视为不可信输入。
- 不提供 shell 执行、任意 SQL、任意路径读写 Command。
- Tauri Capability 按窗口、平台和必要权限最小化。
- 不加载远程页面，不向远程 origin 暴露本地 Command。
- 业务不需要 opener 时移除 `opener:default`。
- 业务界面建立前配置仅允许必要本地资源的 CSP。
- MVP 不保存设备密码、SSH Key 或 API Token。
- 日志不得记录密码、密钥、完整 Excel 原始行、Rust 堆栈或不必要的绝对路径。
- 错误响应使用稳定错误码和 `operationId`，不得把 SQL 或内部异常直接展示给用户。

Tauri 权限控制不能替代 Command 内部的确定性输入校验和领域授权边界。

## 12. 依赖与工具链

- JavaScript 包统一使用 pnpm，不混用 npm、yarn 或 bun。
- Node.js 版本以 `.node-version` 为准，Rust 版本和必需组件以 `rust-toolchain.toml` 为准。
- `packageManager` 字段和 `pnpm-lock.yaml` 是版本真相源。
- Rust 依赖由 Cargo 管理并提交 `src-tauri/Cargo.lock`。
- 新增依赖前说明用途，优先选择维护活跃、范围小、无需高权限的库。
- 平台矩阵固定为 macOS arm64、Windows amd64、Linux amd64/arm64；不执行 Apple 商店发行、Developer ID 或公证。macOS 仅 ad-hoc 签名，Windows 无证书签名。dev.N tag 可发布 Pre-release，其余版本只创建 Draft；四包与来源/摘要全部验证后才能发布。
- 修改依赖后更新对应锁文件，并检查构建脚本权限配置。
- 对版本、API 或安全行为不确定时，查阅当前官方文档，不凭记忆猜测。
- SQLx 选择已由 ADR-001 确认；替换持久化方案需新 ADR，不沿用过时的待选型说明。

## 13. 开发与验证命令

安装依赖：

```bash
pnpm install
```

安装本地提交门禁：

```bash
pnpm hooks:install
```

启动前端：

```bash
pnpm dev
```

启动桌面应用：

```bash
pnpm tauri dev
```

验证前端生产构建：

```bash
pnpm build
```

执行提交前完整门禁：

```bash
pnpm gate
```

验证 Rust：

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

`pnpm gate` 已组合根文件/工作流/架构政策、脚本反例测试、独立 Domain 编译、文档、四处应用版本一致性、bindings 漂移、ESLint、业务和配置 TypeScript、Vitest、前端构建、Rust format、Debug/Release Clippy 和 Rust 全量测试；不得绕过其中任何一项。

仅修改 Markdown 的工作中可先运行轻量文档检查；这不豁免第 16 节的提交、PR 和合并前完整门禁。文档检查包括：

- 相对链接目标存在。
- 标题层级和代码块闭合。
- PRD 需求编号和用户故事追踪没有遗漏或重复。
- 文档版本、日期和变更记录一致。

## 14. 测试要求

- Domain 单元测试覆盖 U 位边界、重叠、唯一活动放置和状态迁移。
- Repository 集成测试使用隔离的临时 SQLite，覆盖迁移、约束、trigger 和事务回滚。
- Application 测试覆盖创建、移动、下架、归档和导入编排。
- React 测试以用户可见行为为中心，不断言组件内部 state。
- 机柜布局计算使用纯函数测试不同机柜规格、起始 U 和设备高度。
- 导入测试必须覆盖重复键、冲突键、标题行、空行、不确定字段和事务失败。
- 修复缺陷时先补充能够复现问题的测试，或在无法自动化时说明原因和人工验证步骤。

测试不能只覆盖成功路径。边界、失败、回滚和破坏性操作是本项目的高风险部分。

## 15. 文档维护

- 产品范围、需求或业务规则变化时更新 `docs/PRD.md`。
- 验收行为、优先级或迭代切片变化时更新 `docs/USER_STORIES.md`。
- 技术选型、数据模型、IPC、架构或安全方案变化时更新 `docs/TECHNICAL_DESIGN.md`。
- 重大技术选择新增 `docs/adr/NNNN-<slug>.md`，记录背景、候选方案、决定和后果。
- 文档发生实质变化时同步更新版本、日期和变更记录。
- 保持“已采用 / 拟采用 / 待 ADR”状态准确；只有代码已落地并验证后才能标记为已采用。
- 不在多个文档复制维护详细技术内容；PRD 和用户故事通过链接引用技术设计。

## 16. 变更纪律

- 开始修改前检查 `git status`，保留用户已有和无关改动。
- 首次基线提交完成后，所有任务必须从 `main` 创建独立分支和 worktree；一个任务对应一个 worktree。
- 每次提交、创建或更新 PR、以及合并前必须执行 `pnpm gate`，不得使用 `--no-verify`。
- 功能分支只通过 squash 合并到 `main`；禁止普通 merge commit。
- 日常功能开发不得直接在 `main` 上进行。
- 不使用破坏性 Git 命令覆盖工作区。
- 不删除、重写或批量格式化任务范围外的文件。
- 数据库 schema migration 必须向前演进；禁止用删除用户数据库作为升级方案。
- 未经用户明确要求，不提交、推送、发布、签名或公证产物。
- 不把构建产物、数据库、日志或导入文件提交到 Git。
- 实现只覆盖当前任务和安全的必要支撑，不顺手扩展 PRD 非目标。

## 17. 交付检查清单

完成任务前：

1. 对照相关 PRD 条目和用户故事验收标准。
2. 运行 `pnpm gate`；门禁未通过不得提交或报告完成。
3. 检查前端、Rust、数据和安全边界没有被绕过。
4. 检查文档与实际实现状态一致。
5. 汇报修改文件、验证结果、未完成项和仍待 ADR 的决策。

不得把“命令能运行”当作功能完成；只有相关用户故事的验收标准得到验证，才能报告该故事完成。
