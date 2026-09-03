# UFrame

UFrame 是一个面向 macOS 的本地桌面机柜与物理设备资产管理工具，用于维护机房、机柜、U 位以及服务器、交换机、路由器和防火墙台账，并通过机柜画布查看设备的物理分布。

## 技术基线

- Tauri 2
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4 + shadcn Base UI
- React Router 7 + TanStack Query 5
- SQLx 0.9 + SQLite
- tauri-specta 类型安全 IPC
- pnpm

## 本地开发

```bash
pnpm install
pnpm hooks:install
pnpm tauri dev
```

Debug 模式可通过侧栏底部的“加载开发数据”创建一组幂等样例数据；Release 构建不包含该入口与命令。

提交前运行完整门禁：

```bash
pnpm gate
```

只生成或校验 IPC bindings：

```bash
pnpm bindings:generate
pnpm bindings:check
```

## 文档

- [产品需求文档](docs/PRD.md)
- [用户故事](docs/USER_STORIES.md)
- [技术设计文档](docs/TECHNICAL_DESIGN.md)
- [开发规范](docs/DEVELOPMENT_GUIDE.md)
- [Iteration 001 验收记录](docs/iterations/0001-walking-skeleton.md)

Iteration 001 已打通“创建位置 → 创建机柜 → 创建设备 → 设备上架 → 多机柜画布展示”的最小闭环。
