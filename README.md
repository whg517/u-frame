# UFrame

[![CI](https://github.com/whg517/u-frame/actions/workflows/ci.yml/badge.svg)](https://github.com/whg517/u-frame/actions/workflows/ci.yml)

UFrame 是一个面向 macOS 的本地桌面机柜与物理设备资产管理工具。它用于维护机房、区域、机柜以及服务器和网络设备台账，并在网格画布中展示和调整设备的真实 U 位。

## 当前能力

- 管理机房、区域、常见或自定义高度的机柜。
- 管理服务器、交换机、路由器和防火墙资产。
- 通过表单完成首次上架、单设备移动和下架。
- 在多机柜画布中筛选、缩放、查看详情并拖动调整已上架设备。
- 对批量位置调整执行边界、重叠和唯一活动放置校验，并在同一 SQLite 事务中保存。
- 在设置中选择系统/浅色/深色外观、五种主题色、简体中文/英语及默认画布缩放，偏好在本机即时保存。
- 数据保存在本机应用数据目录，不依赖远程服务。

Excel 导入导出、备份恢复、完整审计和正式签名发行仍在后续里程碑中。已实现范围和非目标以 [PRD](docs/PRD.md) 为准。

## 技术基线

- Tauri 2、Rust 1.98.1、SQLx 0.9 和 SQLite
- React 19、TypeScript strict、Vite 7
- Tailwind CSS 4、shadcn Base UI
- React Router 7、TanStack Query 5
- tauri-specta 类型安全 IPC
- Node.js 24.20.0、pnpm 11.10.0

## 本地开发

前置条件：macOS、Node.js 与 Rust 工具链。版本由 [.node-version](.node-version)、[rust-toolchain.toml](rust-toolchain.toml) 和 `packageManager` 字段固定。

```bash
pnpm install --frozen-lockfile
pnpm hooks:install
pnpm tauri dev
```

Debug 模式可通过侧栏底部的“加载开发数据”创建幂等样例数据；Release 构建不注册该入口和命令。

提交前运行完整门禁：

```bash
pnpm gate
```

构建本地调试应用：

```bash
pnpm tauri build --debug --bundles app
```

## 协作与发布

- 开发采用短生命周期分支、独立 worktree 和 squash merge，详见 [贡献指南](CONTRIBUTING.md)。
- `main` 和 Pull Request 由 [CI 工作流](.github/workflows/ci.yml) 执行与本地一致的 `pnpm gate`。
- 正式版本通过 annotated SemVer tag 触发 macOS Universal 构建；签名、公证、验收和 Draft Release 发布步骤见 [发布指南](docs/RELEASING.md)。
- 安全问题不要提交公开 Issue，请按 [安全策略](SECURITY.md) 私密报告。

## 文档导航

- [产品需求](docs/PRD.md)
- [用户故事](docs/USER_STORIES.md)
- [技术设计](docs/TECHNICAL_DESIGN.md)
- [开发规范](docs/DEVELOPMENT_GUIDE.md)
- [GitHub 治理](docs/GITHUB_GOVERNANCE.md)
- [发布规范](docs/RELEASING.md)
- [变更记录](CHANGELOG.md)
- [最新迭代验收记录](docs/iterations/0009-default-canvas-zoom.md)

## 许可证

当前仓库未授予开源许可证。除非后续明确选择并加入许可证，否则保留所有权利。
