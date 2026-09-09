# UFrame 开发规范

| 属性 | 内容 |
|---|---|
| 文档状态 | Active |
| 版本 | v1.3 |
| 更新日期 | 2026-09-07 |
| 适用范围 | UFrame 全部代码、文档和配置变更 |
| 关联文档 | [项目协作指南](../AGENTS.md) · [产品需求文档](PRD.md) · [用户故事](USER_STORIES.md) · [技术设计](TECHNICAL_DESIGN.md) |

## 1. 强制原则

以下规则使用 MUST 表示强制要求：

- 所有基线提交完成后的开发 MUST 在独立 Git worktree 中进行。
- 一个任务 MUST 对应一个分支和一个 worktree。
- 功能分支 MUST 通过 squash 方式合并到 `main`。
- 每次本地提交前 MUST 通过 `pnpm gate`。
- 创建或更新 PR 前，以及 squash 合并前，MUST 再次通过 `pnpm gate`。
- 门禁失败时 MUST 停止提交或合并，不得使用 `--no-verify` 绕过。
- `main` MUST 保持可构建；不得直接在 `main` 上进行日常功能开发。

## 2. 当前仓库状态

首次基线提交已完成，worktree 规则已全面生效。GitHub 远程为 `origin` / `https://github.com/whg517/u-frame.git`，新任务以最新 `origin/main` 为基线。

`pnpm gate` 当前强制执行文档链接、应用版本一致性、生成 IPC bindings、ESLint、TypeScript、Vitest、前端构建、Rust 格式、Clippy 和 Rust 全量测试。GitHub `quality-gate` 执行同一入口，门禁项目不得通过 `--if-present` 静默跳过。

## 3. 分支与 worktree

### 3.1 分支命名

| 类型 | 格式 | 示例 |
|---|---|---|
| 功能 | `feat/<slug>` | `feat/rack-canvas` |
| 修复 | `fix/<slug>` | `fix/placement-overlap` |
| 文档 | `docs/<slug>` | `docs/import-rules` |
| 重构 | `refactor/<slug>` | `refactor/tauri-client` |
| 工程 | `chore/<slug>` | `chore/test-gate` |

要求：

- `<slug>` 使用简短英文 kebab-case。
- 分支只承载一个明确任务或一组不可分割的同一目标。
- 不使用个人姓名、日期或含义不明的 `test`、`tmp`、`update`。

### 3.2 创建 worktree

在主工作区中更新基线并创建任务 worktree：

```bash
git fetch origin
mkdir -p ../u-frame-worktrees
git worktree add ../u-frame-worktrees/feat-rack-canvas \
  -b feat/rack-canvas origin/main
```

进入新 worktree 后安装锁定依赖：

```bash
cd ../u-frame-worktrees/feat-rack-canvas
pnpm install --frozen-lockfile
```

如果尚未配置远程仓库，但本地 `main` 已存在基线提交，可以从本地基线创建：

```bash
git worktree add ../u-frame-worktrees/docs-import-rules \
  -b docs/import-rules main
```

禁止：

- 两个 Agent 或开发者同时写同一个 worktree。
- 一个 worktree 在多个无关任务之间反复复用。
- 在 worktree 中切换到其他任务分支。
- 把 `node_modules`、`dist`、`src-tauri/target` 或本地数据库复制进 Git。

### 3.3 同步主分支

任务分支由单一开发者或 Agent 独占时，使用 rebase 获取最新基线：

```bash
git fetch origin
git rebase origin/main
```

要求：

- rebase 前工作区必须干净，或已保存为任务分支提交。
- 不对他人正在使用的共享分支执行 rebase。
- 不向 `main` 强制推送。
- 解决冲突后必须重新执行完整门禁。

## 4. 提交规范

### 4.1 提交前步骤

每次提交前执行：

```bash
git status --short
git diff --check
git diff --staged
pnpm gate
```

确认：

- 变更仅属于当前任务。
- 没有密钥、数据库、日志、导入文件或构建产物。
- 文档和实现状态一致。
- 所有门禁阶段成功结束。

仓库 pre-commit hook 会再次调用 `pnpm gate`。人工执行不是绕过 hook 的理由，而是为了在进入提交步骤前更早发现问题。

### 4.2 提交消息

使用 Conventional Commits 风格：

```text
<type>(<scope>): <summary>
```

示例：

```text
feat(rack): add cabinet capacity form
fix(placement): reject overlapping U ranges
docs(dev): define worktree and squash workflow
chore(gate): add pre-commit quality checks
```

规则：

- `type` 使用 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`。
- `scope` 使用稳定业务域或工程域，例如 `rack`、`asset`、`placement`、`import`、`audit`、`gate`。
- summary 使用英文祈使语气，简洁描述结果。
- 分支内允许多个便于评审的小提交；合并时统一 squash。

## 5. 强制门禁

统一入口：

```bash
pnpm gate
```

门禁按以下顺序执行，任一步失败都会立即停止：

| 阶段 | 命令或检查 | 当前状态 |
|---|---|---|
| Git 空白错误 | `git diff --check`、`git diff --cached --check` | 已建立 |
| Shell 语法 | `bash -n scripts/gate.sh scripts/verify-macos-release.sh .githooks/pre-commit` | 已建立 |
| 文档一致性 | `pnpm docs:check` | 已建立 |
| 应用版本 | `pnpm version:check` | 已建立 |
| 前端 lint | `pnpm lint` | 已建立 |
| 前端测试 | `pnpm test` | 已建立 |
| 前端类型与构建 | `pnpm build` | 已建立 |
| Rust 格式 | `cargo fmt --check` | 已建立 |
| Rust 编译 | `cargo check` | 已建立 |
| Rust lint | `cargo clippy -- -D warnings` | 已建立 |
| Rust 测试 | `cargo test` | 已建立 |

前端业务实现开始前，必须建立非 watch 模式的 `lint` 和 `test` scripts。加入这些 scripts 的同一变更必须确保 `pnpm gate` 会真实执行它们。

### 5.1 文档门禁

`pnpm docs:check` 递归检查根目录治理文档、`docs/` 和 `.github/` 中的 Markdown：

- Markdown 文件存在且非空。
- fenced code block 成对闭合。
- 相对 Markdown 链接目标存在。
- 用户故事编号不重复。
- PRD 中的需求编号全部出现在用户故事文档中。

### 5.2 门禁失败处理

- 修复根因后重新执行完整 `pnpm gate`。
- 不删除测试、不放宽断言、不关闭 TypeScript strict 或 Clippy warning 来制造通过结果。
- 环境故障导致门禁无法运行时，停止提交并记录阻塞原因。
- 不得使用 `git commit --no-verify`。

### 5.3 本地 hook

仓库使用版本化的 `.githooks/pre-commit`。每个 clone 或独立仓库只需执行一次：

```bash
pnpm hooks:install
```

该命令设置：

```text
core.hooksPath=.githooks
```

Git 配置不会随 clone 自动继承，因此新环境必须显式安装 hook。CI 仍需直接执行 `pnpm gate`，不能依赖本地 hook。

## 6. PR 要求

PR 描述至少包含：

- 目标和范围。
- 对应用户故事 ID 和 PRD 需求 ID。
- 关键实现或设计选择。
- 验证命令和结果。
- UI 变更截图或录屏。
- 数据库 schema migration、兼容性和回滚影响。
- 未完成项或已知限制。

创建或更新 PR 前：

```bash
git fetch origin
git rebase origin/main
pnpm gate
```

首次推送任务分支：

```bash
git push -u origin HEAD
```

已经推送过的独占任务分支在 rebase 后使用：

```bash
git push --force-with-lease
```

仅允许在自己独占、已经 rebase 的任务分支上使用 `--force-with-lease`。不得使用裸 `--force`，不得强推 `main`。

## 7. Squash 合并

### 7.1 托管平台合并

默认使用 PR 页面上的 **Squash and merge**：

- 禁止普通 merge commit。
- 禁止把功能分支的临时提交逐个带入 `main`。
- squash 前确认 PR 基于最新 `main` 且门禁通过。
- squash 后 `main` 上每个任务只产生一个语义完整的提交。
- 最终提交消息遵循第 4.2 节格式。

建议 squash 提交正文记录用户故事、主要变更和验证结果。

### 7.2 本地合并备用流程

没有托管平台 PR 时，只能在主工作区执行：

```bash
git switch main
git merge --squash feat/rack-canvas
pnpm gate
git commit -m "feat(rack): add rack canvas"
```

执行前必须确认：

- 主工作区干净且 `main` 已更新。
- 功能分支门禁已通过。
- squash 后暂存内容只属于该任务。
- `main` 上的 pre-commit hook 再次通过。

不得在功能 worktree 中检出并修改 `main`。

## 8. 合并后清理

合并和主分支验证完成后：

```bash
git worktree list
git worktree remove ../u-frame-worktrees/feat-rack-canvas
git fetch --prune
```

Squash 合并不会保留原分支祖先关系，因此 Git 可能不认为功能分支“已合并”。删除本地分支前必须人工确认：

- PR 状态确实为已合并。
- squash 提交存在于 `main`。
- 功能分支没有未包含在最终结果中的额外修改。

确认后再删除本地或远程任务分支。不得仅因 `git branch -d` 失败就直接强制删除。

## 9. CI 与分支保护

GitHub [CI workflow](../.github/workflows/ci.yml) 在 Pull Request、`main` push 和人工触发时使用 macOS runner 执行 `pnpm gate`。稳定的 required check 名称为 `quality-gate`。

目标仓库保护配置为：

- `main` 禁止直接 push。
- PR 必须通过 `pnpm gate` 状态检查。
- PR 必须解决全部讨论；单维护者阶段不强制外部批准。
- 只允许 squash merge。
- 合并后自动删除远程功能分支。
- 禁止管理员无记录绕过门禁。

当前个人账户套餐无法为 Private 仓库启用分支保护；GitHub API 要求升级 Pro 或把仓库改为 Public。仓库保持 Private，因此上述保护目标尚未技术强制。现阶段仍必须走 Pull Request、等待 `quality-gate` 并使用 squash merge；升级套餐或明确公开后应立即启用保护。具体可用性依据和流水线权限、Action SHA 固定、Dependabot、安全功能见 [GitHub 项目治理](GITHUB_GOVERNANCE.md)。

## 10. 发布门禁

提交门禁不等于发布验证。本地可构建 Universal 候选包：

```bash
pnpm install --frozen-lockfile
pnpm gate
pnpm release:build
```

正式发行必须从 `main` 中的 annotated SemVer tag 触发 [Release workflow](../.github/workflows/release.yml)，完成 Universal 构建、Developer ID 签名、Apple notarization、staple 验证、SHA-256 摘要和 Draft Release 安装验收。详细步骤见 [发布规范](RELEASING.md)。

## 11. 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-04 | 建立 worktree 开发、强制提交门禁和 squash 合并规范。 |
| v1.1 | 2026-09-04 | 结束引导例外，记录已启用的完整本地门禁和无远程仓库时的 worktree 基线。 |
| v1.2 | 2026-09-04 | 修正前端 lint、测试和 Rust 测试已纳入门禁的当前状态。 |
| v1.3 | 2026-09-07 | 记录 GitHub 远程、CI required check、版本一致性门禁和 macOS Universal 签名公证发布流程。 |
