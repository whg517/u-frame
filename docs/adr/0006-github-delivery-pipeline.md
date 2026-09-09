# ADR-006：GitHub 主线集成与发行流水线

| 属性 | 内容 |
|---|---|
| 状态 | Accepted；发行部分由 [ADR-008](0008-platform-release-matrix.md) 替代（2026-09-09） |
| 日期 | 2026-09-07 |
| 决策人 | UFrame maintainers |

## 背景

仓库已有本地 `pnpm gate`、worktree 和 squash 规范，但缺少远程门禁、协作模板和可追踪的发行制品。流水线需要保持本地与远程规则一致，并避免 Pull Request 代码获得发布凭据。

## 决策

- `main` 作为唯一长期主线，短生命周期分支通过 Pull Request 和 squash merge 集成。
- Pull Request 和 `main` push 在 macOS runner 执行同一个 `pnpm gate`，required check 名称固定为 `quality-gate`。
- CI 只读取仓库，不使用 `pull_request_target`，不接触发布 environment。
- 正式发行由 `main` 中的 annotated SemVer tag 触发，自动构建、签名、公证和校验，但只创建 Draft Release。
- GitHub Actions 使用最小 `GITHUB_TOKEN` 权限，外部 Action 固定完整 commit SHA。
- npm、Cargo 和 Actions 依赖由 Dependabot 提交普通 PR，不自动合并。

## 后果

- 本地门禁与远程门禁只有一个真实入口，降低规则漂移。
- macOS CI 成本高于 Linux，但直接验证 Tauri 的目标平台编译链。
- 发布必须提前配置和轮换 Apple secrets；缺失时明确失败，不生成未签名正式包。
- Draft Release 需要人工安装验收和发布，避免“tag 已推送”等同于“产品已发布”。

## 被否决方案

- GitFlow 长期 `develop`/`release` 分支：当前单产品、单主线不需要多条长期维护线。
- Pull Request 使用 Linux、发布才使用 macOS：成本较低，但不能持续验证目标平台 Tauri 编译。
- Tag 后自动公开 Release：缺少下载后安装和 Gatekeeper 验收步骤。
- 允许 Action 使用可移动 major tag：维护方便，但弱于完整 SHA 的供应链约束。
