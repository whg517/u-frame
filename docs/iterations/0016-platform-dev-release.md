# Iteration 016：多平台 dev 发布

| 属性 | 内容 |
|---|---|
| 日期 | 2026-09-09 |
| 基线 | eb40bb73559252317e99c3ffe709a0849af7dd30 |
| 版本 | 0.1.0-dev.1 |
| 状态 | 实现与本地验证完成；远程四平台构建和 Release 资产待验证 |
| 依据 | 用户明确变更平台范围和分发方式；[ADR-008](../adr/0008-platform-release-matrix.md) |

## 范围

macOS arm64 DMG、Windows amd64 NSIS EXE、Linux amd64/arm64 DEB，通过 GitHub Release 提供；无 Apple 商店、Developer ID、公证或 Windows 证书。macOS 使用 ad-hoc 签名。

替换原 Universal 签名发布脚本与针对旧政策的测试，保留源码/tag、门禁、制品唯一性和摘要防篡改控制。新增四包集合验证、二进制架构检查和 dev/稳定通道控制测试。

扩大 Tauri capability 到三个桌面系统；Windows 路径测试用合法的百分号文件名保留 URI 特殊字符覆盖，Unix 保留问号路径场景。没有更改业务数据库 schema、用户数据或备份迁移边界。

## 验证记录

- 本地 pnpm gate 已通过，包含 78 项前端、25 项 Rust 测试（含 9 项独立 Domain）；发布脚本增补后共 18 项工具测试通过，提交钩子再次执行完整门禁。
- PR 四平台试构建必须完成，PR 不得发布。
- main CI、annotated tag、Release 四目标和下载后摘要必须复核；精确 SHA、run 和下载链接记录在发布 Issue/PR。
- 自动构建和单元测试不等于四平台人工安装、首次启动与交互验收；本轮未执行的项目明确保留。
- 本地 Node 22.23.2 / Rust 1.96.1 为兼容验证；远程使用锁定 Node 24.20.0 / Rust 1.98.1。
- 发布状态与验收证据见 [Issue #18](https://github.com/whg517/u-frame/issues/18)；合并并不等于发行完成。
