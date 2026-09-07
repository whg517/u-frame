# UFrame GitHub 项目治理

| 属性 | 内容 |
|---|---|
| 文档状态 | Active |
| 版本 | v1.0 |
| 更新日期 | 2026-09-07 |
| 仓库 | `whg517/u-frame` |
| 关联文档 | [贡献指南](../CONTRIBUTING.md) · [开发规范](DEVELOPMENT_GUIDE.md) · [发布规范](RELEASING.md) · [安全策略](../SECURITY.md) |

## 1. 仓库定位

GitHub 是 UFrame 源码协作、Issue、Pull Request、自动门禁和发行制品的托管平台。应用运行和用户资产数据仍保持本机、单用户、离线优先；引入 GitHub 不改变产品数据边界。

仓库初始设为 Private，未选择开源许可证。切换为 Public 前必须先完成敏感信息扫描、依赖与许可证复核、贡献治理评审，并由所有者明确选择许可证。

## 2. Issue 与 Pull Request

- 缺陷使用结构化表单，必须提供版本、macOS 环境、复现步骤和预期/实际结果。
- 功能建议先说明用户场景和期望结果，并确认不偏离本地桌面产品边界。
- 安全漏洞不进入普通 Issue；当前 Private 仓库按 [安全策略](../SECURITY.md) 通过既有私密渠道联系所有者。
- Pull Request 使用统一模板，追踪用户故事和 PRD，记录验证、数据兼容性、回滚及已知限制。
- UI 变化必须附真实 Tauri 窗口截图或录屏，静态组件测试不能替代桌面验收。

## 3. 分支与合并策略

`main` 是唯一长期主线，必须始终可构建。日常开发使用短生命周期分支和独立 worktree，通过 Pull Request 合并。

仓库设置要求：

- 只允许 squash merge，禁用 merge commit 和 rebase merge。
- 合并后自动删除远程功能分支。
- `main` 禁止强推和删除，要求线性历史。
- 变更必须通过 Pull Request，所有讨论必须解决。
- `quality-gate` 是必须通过的状态检查，并要求分支基于最新 `main`。
- 单维护者阶段不强制一名外部批准，避免所有者无法批准自己的 PR；增加维护者后再启用至少一名批准者。
- 管理员同样受保护规则约束；紧急绕过必须留下 Issue、原因和事后复盘。

## 4. 自动化流水线

### CI

[CI workflow](../.github/workflows/ci.yml) 在 Pull Request、`main` push 和人工触发时运行一个稳定名称为 `quality-gate` 的 macOS job：

1. 以只读权限检出源码，不保留 Git 凭证。
2. 安装锁定的 Node.js、pnpm 和 Rust 工具链。
3. 使用 `pnpm install --frozen-lockfile` 安装依赖。
4. 执行与本地相同的 `pnpm gate`。

工作流设置并发取消，同一分支的新提交会取消旧 CI，减少无效消耗。

### Release

[Release workflow](../.github/workflows/release.yml) 仅响应 `v*.*.*` tag，使用 `release` environment 和 `contents: write`。它在创建 Draft Release 前验证版本、tag、主线归属、完整门禁、签名、公证、staple 和 SHA-256 摘要。GitHub Release 的人工发布步骤不会由 tag push 自动替代。

### 依赖更新

[Dependabot](../.github/dependabot.yml) 每周分别检查 npm、Cargo 和 GitHub Actions。依赖升级仍必须通过普通 Pull Request、完整门禁和兼容性评审；不得因为更新来自机器人而跳过验证。

## 5. Workflow 安全边界

- CI 使用 `pull_request`，不使用具有目标仓库写权限的 `pull_request_target` 执行贡献分支代码。
- 每个 workflow 显式声明最小 `GITHUB_TOKEN` 权限。
- 外部 Action 固定到完整 commit SHA，并由 Dependabot 提交更新 PR。
- CI 不读取发布证书或 Apple 凭据。
- 发布凭据只保存在 GitHub `release` environment secrets 中，脚本只检查是否存在，不打印值。
- Release 只从 `main` 中的 annotated tag 构建；不接受任意分支输入或动态脚本 URL。
- 构建产物不回写 Git，不把证书、数据库或用户数据打包进 Release。

## 6. 安全功能与后续增强

基础阶段启用依赖图、Dependabot alerts 和 Dependabot security updates。GitHub Private Vulnerability Reporting 仅适用于 Public 仓库；如果未来仓库公开，再按 [安全策略](../SECURITY.md) 启用并验证。以下能力只有在仓库套餐和功能可用并完成验证后才标记为已启用：

- Dependency Review required check。
- CodeQL 或其他 SAST required check。
- GitHub Artifact Attestation。
- Immutable Releases。
- Release environment 人工审批规则。

## 7. 管理审计

每次调整仓库可见性、合并策略、保护规则、Actions 权限、环境或安全功能时，应在对应 Issue 或 PR 中记录：变更人、原因、日期、预期效果和验证结果。仓库 UI 中“已设置”不等于流程已验证；必须用实际 PR 或发行候选运行证明规则生效。
