# UFrame

UFrame 是一个面向 macOS 的本地桌面机柜与物理设备资产管理工具，用于维护机房、机柜、U 位以及服务器、交换机、路由器和防火墙台账，并通过机柜画布查看设备的物理分布。

## 技术基线

- Tauri 2
- React 19 + TypeScript
- Vite 7
- pnpm
- SQLite（计划接入）

## 本地开发

```bash
pnpm install
pnpm hooks:install
pnpm tauri dev
```

仅构建前端：

```bash
pnpm build
```

## 文档

- [产品需求文档](docs/PRD.md)
- [用户故事](docs/USER_STORIES.md)
- [技术设计文档](docs/TECHNICAL_DESIGN.md)
- [开发规范](docs/DEVELOPMENT_GUIDE.md)

当前项目处于需求与架构设计阶段，尚未实现业务功能。
