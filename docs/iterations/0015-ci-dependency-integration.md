# Iteration 015：CI 修复与依赖集成

| 属性 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 状态 | 本地完整门禁通过；按集成 PR 的远程门禁交付 |
| 基线 | 28705257cfd4bfa11a0f32ae18a854efaf9c4932 |
| 分支 | fix/ci-dependency-integration |
| 范围 | 现有依赖 PR 的选择性集成、TypeScript 配置与回归测试 |

## 1. 失败原因

[PR #5 的 CI](https://github.com/whg517/u-frame/actions/runs/34327129132) 在 TypeScript 类型检查阶段报 TS5101；不是主分支 CI 回归。TypeScript 6 已弃用 baseUrl，前端和 Node 配置均仍声明该选项。

本地安装 TypeScript 6.0.3 后，分别运行 pnpm typecheck 和 pnpm exec tsc -p tsconfig.node.json --noEmit，两个配置都以退出码 2 复现相同错误。修复移除两处 baseUrl，保留已有的显式 paths、bundler 解析、Vite/Vitest 别名及 strict。修复后两套类型检查通过，不使用 ignoreDeprecations。

## 2. 集成范围与追踪

通过一个集成 PR 验证组合结果，合并后关闭已被完整替代的来源 PR；不是逐个独立合并。

| 来源 | 集成内容 | 审查要点 |
|---|---|---|
| [#2](https://github.com/whg517/u-frame/pull/2) | setup-node 7.0.0 | CI 和 Release 保留 Node 版本文件、pnpm 缓存和 SHA 锁定 |
| [#3](https://github.com/whg517/u-frame/pull/3) | checkout 7.0.1 | 保留只读检出、不持久化凭据；不启用不安全 PR 检出 |
| [#5](https://github.com/whg517/u-frame/pull/5) | TypeScript 6.0.3 与迁移修复 | 同时检查业务与构建/测试配置，增加两项配置回归测试 |
| [#16](https://github.com/whg517/u-frame/pull/16) | Base UI 1.8.0、lucide-react 1.41.0、React DOM 类型 19.2.7、ESLint 10.10.0、shadcn 4.21.0 | 应用源码组件不重新生成，保留受限构建脚本授权 |

Router 8（#6）、Vitest 5（#7）、React 构建插件 5（#8）保留原 PR，后续单独评估跨主版本兼容性；CI 通过不等同于真实桌面交互验收。

## 3. 验证与交付边界

- 自动回归检查两套 TypeScript 配置：strict、bundler、无 baseUrl/弃用抑制、真实 @/ 模块解析。
- 完整 pnpm gate 本地通过：16 项脚本测试、9 项独立 Domain 测试、78 项前端测试、25 项 Rust 测试（包含 Domain）；治理、35 份文档、版本、bindings、ESLint、两套 TypeScript、构建、format 和 Debug/Release Clippy 均通过。
- 构建保留既有 Zod 注释和入口包大于 500 kB 的警告，不提高阈值或屏蔽输出。
- 集成分支和 main 的远程 CI 必须通过；具体 SHA 与 run 链接记录在集成 PR。
- 本地工具链为 Node 22.23.2 / pnpm 11.10.0 / Rust 1.96.1；权威 CI 使用仓库固定的 Node 24.20.0 / Rust 1.98.1。
- 不变更业务代码、IPC、数据库 schema 或用户数据，不触发 tag、签名、公证与发布；真实 Tauri 交互和签名发行不在本次验收范围。
- 回退方式为独立 PR 还原本次依赖、锁文件和配置变更，不需要业务数据回滚。

## 4. 官方依据

- [TypeScript 6 迁移说明](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)：移除 baseUrl，使用显式 paths。
- [checkout 7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) 与 [checkout README](https://github.com/actions/checkout/tree/v7.0.1)：新版安全检出行为与运行器要求。
- [setup-node 7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0)：ESM、依赖更新和缓存行为。
