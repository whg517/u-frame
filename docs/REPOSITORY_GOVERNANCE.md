# UFrame 仓库治理规范

| 属性 | 内容 |
|---|---|
| 状态 | Active |
| 版本 | v1.1 |
| 日期 | 2026-09-09 |
| 范围 | 文档、实现代码、脚本、CI/Release、根目录文件 |

## 1. 治理目标

以可验证的边界降低维护和交付风险，不引入与本地单用户桌面工具无关的服务、角色或审批系统。单维护者负责评审，自动门禁负责可机械验证的规则；两者不能互相替代。

本规范不新增产品功能，不包含备份、跨安装数据迁移、数据恢复或自定义数据库位置。内部 schema migration 仍按已有兼容性规则向前演进。

## 2. 文档与配置真相源

| 内容 | 唯一主责文件 | 更新要求 |
|---|---|---|
| 业务范围、非目标 | [PRD](PRD.md) | 行为变化更新需求编号与验收 |
| 用户任务和行为验收 | [用户故事](USER_STORIES.md) | 引用真实需求，不用故事 ID 冒充覆盖 |
| 当前技术实现与差距 | [技术设计](TECHNICAL_DESIGN.md) | 区分已采用、拟采用和未实现 |
| 重大设计选择 | docs/adr | 不覆盖旧决定；新 ADR 说明取代范围 |
| 提交、合并与门禁 | [开发规范](DEVELOPMENT_GUIDE.md) | 必须与 scripts/gate.sh 一致 |
| GitHub 权限与发布 | [GitHub 治理](GITHUB_GOVERNANCE.md)、[发布规范](RELEASING.md) | 区分工作流配置、远程设置与实际运行证据 |
| 根文件分类 | [root-files.json](../scripts/root-files.json) | 新增/删除根文件同步用途登记 |
| 工具链 | .node-version、rust-toolchain.toml、packageManager | CI 读取这些文件，不重复硬编码 |
| 应用版本 | package.json、Cargo.toml、Cargo.lock、tauri.conf.json | 四处一致；tag 必须匹配 |

根 README 保持项目入口；docs/README 提供文档索引。Iteration 文档是当时的审计证据，不追改旧测试数或把历史“待实现”替换为现在的事实。活动规范实质变化须更新版本、日期和记录。

## 3. 代码设计规则

- G-CODE-01：前端 app → features → shared，feature 不直接依赖另一 feature；跨域实体查询放 shared/queries。ESLint 检查生产路径，集成测试可跨域。
- G-CODE-02：服务器状态归 TanStack Query，表单输入归表单，画布编辑草稿归当前编辑会话，UI 偏好归版本化本地存储。禁止无理由建立第二份业务真相源。
- G-CODE-03：Domain 使用纯输入/输出，不依赖 IPC DTO、数据库或 I/O。应用层附加 operationId；adapter 分类数据库错误。
- G-CODE-04：新事务端口由应用层定义，adapter 实现；端口契约明确提交与 Drop 回滚。批量移动已落实，普通 CRUD 仍是登记的过渡边界，见 [ADR-007](adr/0007-domain-and-transaction-ports.md)。
- G-CODE-05：跨行变更先校验最终状态、再原子写入；数据库约束不可由前端禁用按钮代替。
- G-CODE-06：TypeScript 业务代码和工具配置均 strict 检查；browser/node 全局按文件范围分开。禁止用错误抑制注释掩盖缺失的环境类型。

评审不能仅按文件行数判断架构优劣。必须检查职责、依赖方向、状态所有权、失败边界和测试能否独立证明业务不变量。

## 4. 根目录与依赖

- G-ROOT-01：可版本化根文件必须在 root-files.json 声明用途；新配置先确认是根级工具入口还是应放 scripts/docs。
- G-ROOT-02：EditorConfig、Git attributes 统一文本格式；二进制图标不做行尾转换。
- G-ROOT-03：数据库及 WAL/SHM、密钥/证书、环境文件、缓存、构建产物不进 Git。gitignore 只降低误提交风险，不能替代敏感信息审查或发现泄露后的轮换。
- G-DEP-01：构建插件、代码生成器和脚手架 CLI 属于 devDependencies；业务运行依赖留在 dependencies。锁文件必须提交，安装使用 frozen lockfile。
- G-DEP-02：新依赖说明用途；禁止为了目录美观全量升级。工具 YAML 解析使用明确依赖，不用正则假装完成 YAML 语义解析。
- 未选定开源许可证前不自动添加 LICENSE；仓库可见性、权限和签名凭据变更仍需要所有者明确授权。

## 5. 脚本契约

- G-SCRIPT-01：脚本从自身位置定位仓库，路径带引号；参数或前置条件错误返回非零状态，不继续执行后续副作用。
- G-SCRIPT-02：把可纯测的文档、版本、workflow 策略与文件系统 CLI 分离；Node 内建测试覆盖错误输入，shell 测试隔离外部命令。
- G-SCRIPT-03：发布必须选中唯一 app/DMG；全部验证成功后原子生成摘要，发布前再次确认摘要绑定当前 DMG；不能取 glob 的第一项。
- G-SCRIPT-04：二进制/制品 fixture 和外部工具 stub 只证明格式、调用与失败阻断，不证明四平台真实安装成功。
- G-SCRIPT-05：脚本不能打印凭据，不能执行用户输入拼接的 shell；工作流表达式通过 env 进入固定脚本。

## 6. CI 和发布控制

- G-CI-01：quality-gate 名称稳定，PR 和 main push 执行同一 pnpm gate；每个 job 有超时，外部 Action 固定完整 SHA。
- G-CI-02：默认 contents: read，checkout 不保留凭据；禁止 pull_request_target/workflow_run 驱动的特权执行。
- G-CI-03：Release 先在只读 job 验证来源和完整门禁，再由四个只读原生 job 构建；contents: write 只授予 tag 事件的汇总发布 job。
- G-CI-04：不读取 Apple 或外部签名 secrets；GitHub token 仅显式注入 publish 步骤。step env 不是进程或供应链安全沙箱。
- G-CI-05：四目标全部通过原生测试、构建、架构和来源绑定摘要校验才允许发布；dev.N 为非 latest 预发行，其他版本 Draft。缺失/重复/篡改包必须失败，禁止覆盖已发布版本。

依据：[GitHub Actions 安全使用](https://docs.github.com/en/actions/reference/security/secure-use)要求最小权限、固定 Action 与谨慎处理不可信输入；[ADR-008](adr/0008-platform-release-matrix.md) 定义当前四平台矩阵与发行边界。

## 7. 控制证据与例外

pnpm gate 自动执行仓库清单/工作流策略、脚本反例测试、独立 Domain 编译、文档追踪、四处版本、bindings、前端和 Rust 质量检查。具体顺序以 [gate.sh](../scripts/gate.sh) 为执行真相源；不能只改文档宣称增加了门禁。

仍需人工评审：业务故事是否真实被验收、SQL 事务设计、前端任务连续性、依赖供应链、产品非目标、各平台安装体验与远程保护是否真正启用。当前 workflow policy 不是完整 GitHub schema 验证器，不替代托管 CI；shell 语法检查不等于全量安全扫描。

例外必须记录原因、影响、证据和后续关闭条件，不能关闭严格检查、删除失败断言或绕过 hook。评审结果保存在 [Iteration 014](iterations/0014-repository-governance.md)。

## 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-09 | 建立仓库治理责任、架构约束和可执行控制，明确未覆盖边界。 |
| v1.1 | 2026-09-09 | 按用户决定采用 macOS arm64、Windows amd64、Linux amd64/arm64 GitHub Release 分发，撤销原 Apple Universal 签名公证要求。 |
