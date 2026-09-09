# UFrame GitHub 项目治理

| 属性 | 内容 |
|---|---|
| 文档状态 | Active |
| 版本 | v1.2 |
| 更新日期 | 2026-09-09 |
| 仓库 | `whg517/u-frame` |
| 关联文档 | [贡献指南](../CONTRIBUTING.md) · [开发规范](DEVELOPMENT_GUIDE.md) · [发布规范](RELEASING.md) · [安全策略](../SECURITY.md) |

## 1. 仓库定位

GitHub 是 UFrame 源码协作、Issue、Pull Request、自动门禁和发行制品的托管平台。应用运行和用户资产数据仍保持本机、单用户、离线优先；引入 GitHub 不改变产品数据边界。

仓库初始设为 Private，未选择开源许可证。切换为 Public 前必须先完成敏感信息扫描、依赖与许可证复核、贡献治理评审，并由所有者明确选择许可证。

## 2. Issue 与 Pull Request

- 缺陷使用结构化表单，必须提供版本、操作系统与架构、复现步骤和预期/实际结果。
- 功能建议先说明用户场景和期望结果，并确认不偏离本地桌面产品边界。
- 安全漏洞不进入普通 Issue；当前 Private 仓库按 [安全策略](../SECURITY.md) 通过既有私密渠道联系所有者。
- Pull Request 使用统一模板，追踪用户故事和 PRD，记录验证、数据兼容性、回滚及已知限制。
- UI 变化必须附真实 Tauri 窗口截图或录屏，静态组件测试不能替代桌面验收。

## 3. 分支与合并策略

`main` 是唯一长期主线，必须始终可构建。日常开发使用短生命周期分支和独立 worktree，通过 Pull Request 合并。

已应用的仓库设置：

- 只允许 squash merge，已禁用 merge commit 和 rebase merge。
- 合并后自动删除远程功能分支。
- Actions 默认 `GITHUB_TOKEN` 权限为只读，且工作流不能自动批准 Pull Request。

`main` 保护规则要求：

- `main` 禁止强推和删除，要求线性历史。
- 变更必须通过 Pull Request，所有讨论必须解决。
- `quality-gate` 是必须通过的状态检查，并要求分支基于最新 `main`。
- 单维护者阶段不强制一名外部批准，避免所有者无法批准自己的 PR；增加维护者后再启用至少一名批准者。
- 管理员同样受保护规则约束；紧急绕过必须留下 Issue、原因和事后复盘。

当前仓库为个人账户下的 Private 仓库，[GitHub Free 只为 Public 仓库提供分支保护](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)，API 也明确返回当前套餐不支持。仓库保持 Private，因此上述 `main` 规则目前是待启用控制，不得报告为已生效；在升级 GitHub Pro 或由所有者明确改为 Public 后，应立即配置并用实际 Pull Request 验证。在此之前，维护者按流程自律，不直接 push `main`，但这不是等价的技术强制。

## 4. 自动化流水线

### CI

[CI workflow](../.github/workflows/ci.yml) 在 Pull Request、`main` push 和人工触发时运行一个稳定名称为 `quality-gate` 的 macOS job：

1. 以只读权限检出源码，不保留 Git 凭证。
2. 安装锁定的 Node.js、pnpm 和 Rust 工具链。
3. 使用 `pnpm install --frozen-lockfile` 安装依赖。
4. 执行与本地相同的 `pnpm gate`。

工作流设置并发取消，同一分支的新提交会取消旧 CI，减少无效消耗。

### Release

[Release workflow](../.github/workflows/release.yml) 响应版本 tag 和相关 main PR 试构建，默认只读。verify-source 执行完整门禁并对 tag 校验四处版本、annotated tag 和主线归属；四个平台的 build job 全部成功后，只有 tag 事件的 publish job 获得 contents: write。重新验证全部包的来源、架构清单和摘要后，dev.N 发布 Pre-release，稳定及其他版本只创建 Draft。详见 [ADR-008](adr/0008-platform-release-matrix.md)。

### 依赖更新

[Dependabot](../.github/dependabot.yml) 每周分别检查 npm、Cargo 和 GitHub Actions。依赖升级仍必须通过普通 Pull Request、完整门禁和兼容性评审；不得因为更新来自机器人而跳过验证。

## 5. Workflow 安全边界

- CI 使用 `pull_request`，不使用具有目标仓库写权限的 `pull_request_target` 执行贡献分支代码。
- 每个 workflow 显式声明最小 `GITHUB_TOKEN` 权限。
- 外部 Action 固定到完整 commit SHA，并由 Dependabot 提交更新 PR。
- CI 和发布流程均不读取外部签名证书或 Apple 凭据。
- 不使用发布 environment 或 Apple secrets；仅 publish job 的发布步骤显式接收 GitHub token。构建 job 无仓库写权限；step env 不是供应链沙箱。
- Release 只从 `main` 中的 annotated tag 构建；不接受任意分支输入或动态脚本 URL。
- 构建产物不回写 Git，不把证书、数据库或用户数据打包进 Release。
- pnpm 版本由 packageManager、Node 由 .node-version、Rust 由 rust-toolchain.toml 提供，不在 workflow 重复维护。
- 本仓库的 workflow policy 检查 SHA、只读默认、超时、禁止特权触发、凭据位置和发布验证先后；不能替代 GitHub 的实际工作流运行或远程保护设置验证。

## 6. 安全功能与后续增强

基础阶段启用依赖图、Dependabot alerts 和 Dependabot security updates。GitHub Private Vulnerability Reporting 仅适用于 Public 仓库；如果未来仓库公开，再按 [安全策略](../SECURITY.md) 启用并验证。以下能力只有在仓库套餐和功能可用并完成验证后才标记为已启用：

- Dependency Review required check。
- CodeQL 或其他 SAST required check。
- GitHub Artifact Attestation。
- Immutable Releases。
- Release environment 人工审批规则。

## 7. 管理审计

每次调整仓库可见性、合并策略、保护规则、Actions 权限、环境或安全功能时，应在对应 Issue 或 PR 中记录：变更人、原因、日期、预期效果和验证结果。仓库 UI 中“已设置”不等于流程已验证；必须用实际 PR 或发行候选运行证明规则生效。

## 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-07 | 建立 GitHub 协作、权限和发布治理。 |
| v1.1 | 2026-09-09 | 分离来源验证与签名 job，收窄凭据和写权限范围，增加可执行 workflow 政策。 |
| v1.2 | 2026-09-09 | 按用户决定采用 macOS arm64、Windows amd64、Linux amd64/arm64 GitHub Release 分发，撤销原 Apple Universal 签名公证要求。 |
