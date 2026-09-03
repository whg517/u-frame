# Iteration 001：行走骨架

| 属性 | 内容 |
|---|---|
| 状态 | Verified |
| 日期 | 2026-09-04 |
| 分支 | `feat/walking-skeleton` |

## 目标与范围

打通“创建机房和区域 → 创建机柜 → 创建设备 → 首次上架 → 多机柜画布查看”的最小闭环。包含首次创建、读取、放置校验、系统主题、Debug 手动样例和只读设备详情。

不包含编辑、归档、移动、下架、搜索、导入导出、备份、业务审计、拖拽、缩放和大规模虚拟化。

## 实现摘要

- SQLx SQLite、内嵌迁移、应用数据目录数据库和双层放置约束。
- tauri-specta Commands 与 TypeScript bindings 漂移门禁。
- 固定侧栏、独立创建页、设备上架页和简洁灰阶多机柜画布。
- Debug 空库样例加载；Release 不注册命令且不显示入口。

## 验证记录

- 功能 worktree 于 2026-09-04 执行 `pnpm gate` 通过：文档检查、bindings 无漂移、ESLint、TypeScript、4 个 Vitest 测试、生产构建、Rust format、Debug/Release Clippy `-D warnings` 和 7 个 Rust 测试全部通过。
- Rust 测试覆盖完整创建与上架闭环、相邻 U 位、边界 U 位、重叠与越界拒绝、事务回滚、SQLite trigger 兜底，以及 Debug 样例幂等性。
- 实际 macOS Tauri 应用完成空库启动、IPC 查询、多机柜画布、设备选择详情和重启持久化检查；验收数据随后从应用数据库清理，恢复为空库。
- 视觉检查覆盖系统深色外观和浅色设计令牌；机柜保持 1px 线框、灰阶设备面板、最大 U 在顶、U1 在底，并按 U1 基线横向对齐。
- Vite Debug 界面确认显示“加载开发数据”，生产构建确认该入口被裁剪；Rust Release 编译确认不注册 `seed_dev_data`。

功能分支已通过本地 squash 合并到 `main`；squash 暂存树和最终提交的预提交钩子均再次执行上述完整门禁并通过。
