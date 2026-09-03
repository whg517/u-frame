# ADR-002：使用 tauri-specta 生成 IPC bindings

| 属性 | 内容 |
|---|---|
| 状态 | Accepted |
| 日期 | 2026-09-04 |

## 背景

手工维护 Rust Command DTO 和 TypeScript 类型容易产生参数名、可空性和错误返回漂移。

## 决定

采用精确锁定的 `tauri-specta =2.0.0-rc.25` 与 `specta =2.0.0-rc.25`，从 Rust Commands 生成前端 bindings。业务组件只调用集中包装后的 typed client。

## 后果

- `pnpm bindings:generate` 显式更新生成文件，`pnpm bindings:check` 在临时目录生成并比较，门禁不修改受控文件。
- RC 版本不得使用宽松版本范围；升级必须重新生成并验证所有 Commands。
- JavaScript number 不安全的 Rust 大整数不得进入 IPC，本项目 U 位和功率统一使用 `i32`。
