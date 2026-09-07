# Iteration 007：GitHub 交付基础

| 属性 | 内容 |
|---|---|
| 状态 | Implemented / Verification pending |
| 日期 | 2026-09-07 |
| 分支 | `chore/github-delivery` |
| 范围 | 项目文档、GitHub 协作治理、CI、版本门禁和 macOS Release 流程 |

## 1. 迭代目标

把 UFrame 从仅有本地 Git 和本地门禁的工程，升级为可在 GitHub 上协作、持续验证并按规范生成 macOS Universal 发行候选的项目，同时不改变应用本地离线的数据边界。

## 2. 实现范围

- 建立 Private GitHub 仓库 `whg517/u-frame` 和 `origin`。
- 重构 README 文档导航，增加贡献指南、安全策略、变更记录、GitHub 治理和发布规范。
- 增加结构化缺陷/功能 Issue 表单、Pull Request 模板和 CODEOWNERS。
- 增加 npm、Cargo 和 GitHub Actions 每周 Dependabot 更新。
- 增加 macOS `quality-gate`，在 Pull Request 和 `main` 上执行与本地一致的 `pnpm gate`。
- 将 Node.js、pnpm 和 Rust 工具链固定到明确版本，并校验 `package.json`、Cargo 和 Tauri 三处应用版本一致。
- 增加 tag 驱动的 Universal macOS 构建、Developer ID 签名、Apple notarization、staple、SHA-256 和 Draft Release 流程。
- GitHub Actions 固定到完整 commit SHA，CI 使用只读权限且不接触发布凭据。
- 记录 Universal DMG 和 GitHub 交付流水线两项 ADR。

## 3. 非目标

- 本迭代不创建 `v0.1.0` tag，不发布 GitHub Release。
- 本迭代不生成或上传 Apple 证书、app-specific password 等发布凭据。
- 本迭代不承诺尚未实现的 Excel、备份恢复或完整审计能力。
- 本迭代不把仓库切换为 Public，也不擅自选择开源许可证。

## 4. 验证计划

- 递归文档检查覆盖根目录、`docs/`、ADR、iterations 和 `.github/` Markdown。
- 校验两份 workflow、Dependabot 和 Issue Forms 的 YAML 语法。
- 本地执行 `pnpm version:check`、Shell 语法检查和完整 `pnpm gate`。
- squash 合并后在 `main` 再执行完整 `pnpm gate` 并推送 `origin/main`。
- 等待首次 GitHub `CI / quality-gate` 成功，再配置并读取仓库合并、安全和 `main` 保护设置。
- Release workflow 只做静态契约和脚本验证；没有 Apple 凭据和真实 tag 时不得报告签名、公证或安装验收已完成。

## 5. 验收结果

- 待本地门禁、远程 CI 和 GitHub 设置读取验证后补充。
