# ADR-005：macOS 使用 Universal DMG 分发

| 属性 | 内容 |
|---|---|
| 状态 | Accepted |
| 日期 | 2026-09-07 |
| 决策人 | UFrame maintainers |

## 背景

UFrame 首期只支持 macOS，但需要覆盖 Apple Silicon 和仍在使用的 Intel Mac。可选方案是分别发布两个架构包，或发布同时包含两种架构的 Universal Binary。

## 决策

GitHub 正式发行构建同时安装 `aarch64-apple-darwin` 和 `x86_64-apple-darwin` targets，使用 Tauri `--target universal-apple-darwin` 生成一个 Universal `.app` 和一个 Universal `.dmg`。

正式 DMG 必须使用 Developer ID Application 证书签名、完成 Apple notarization，并在创建 Draft Release 前验证 codesign 和 stapler。Intel 与 Apple Silicon 安装验收仍分别记录，Universal 文件不能替代双架构实际启动证据。

## 后果

- 用户不需要判断 CPU 架构，下载入口唯一。
- 构建时间、产物体积和 CI 成本高于单架构包。
- 依赖的 Rust/Tauri 原生组件必须同时支持两种 target。
- 任一架构构建、签名或验收失败都会阻止整个发行。

## 被否决方案

- 分别发布 Intel 和 Apple Silicon DMG：减小单包体积，但增加用户选择错误、发布资产和验收矩阵。
- 只发布 Apple Silicon：不能覆盖首期定义的 macOS 用户范围。
