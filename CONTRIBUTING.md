# 贡献指南

感谢参与 UFrame。提交代码、文档或配置前，请先阅读 [AGENTS.md](AGENTS.md)、[开发规范](docs/DEVELOPMENT_GUIDE.md) 和与任务相关的需求文档。

## 开始之前

1. 在 Issue 中说明用户问题、范围和验收标准；小型明确修复可以直接在 PR 中说明。
2. 从最新 `origin/main` 创建一个短生命周期分支和独立 worktree。
3. 使用锁定版本安装依赖，并安装本地 pre-commit hook。

```bash
git fetch origin
git worktree add ../u-frame-worktrees/feat-example -b feat/example origin/main
cd ../u-frame-worktrees/feat-example
pnpm install --frozen-lockfile
pnpm hooks:install
```

## 开发要求

- 保持 `app → features → shared`；Rust 由 Command 调用 Application，Application 使用纯 Domain 与自有端口，Infrastructure 实现端口，Domain 不依赖 Repository。当前迁移边界见 [ADR-007](docs/adr/0007-domain-and-transaction-ports.md)。
- 用户可见文案默认使用中文；稳定错误码、代码标识符和数据库字段使用英文。
- 数据不变量必须由 Rust 和 SQLite 事务边界保护，不能只依赖前端校验。
- UI 修改必须在真实 Tauri 窗口中检查关键状态。
- 不提交密钥、本地数据库、日志、备份、导入文件或构建产物。

## 提交与 Pull Request

提交前执行：

```bash
git diff --check
pnpm gate
git commit -m "type(scope): concise imperative summary"
```

Pull Request 必须填写仓库模板，包括需求追踪、验证证据、数据兼容性和已知限制。UI 变更需要截图或录屏。CI 的 `quality-gate` 必须通过，讨论必须解决，最终只使用 squash merge。

## 报告问题

- 一般缺陷使用 GitHub 的“缺陷报告”表单，并提供最短复现路径。
- 功能建议先描述用户场景和期望结果，不要只给出界面或技术方案。
- 安全漏洞按 [安全策略](SECURITY.md) 私密报告，不得公开资产数据或利用细节。
