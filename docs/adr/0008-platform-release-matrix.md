# ADR-008：四平台构建与 GitHub Release 分发

| 属性 | 内容 |
|---|---|
| 状态 | Accepted |
| 日期 | 2026-09-09 |
| 决策依据 | 用户明确要求 GitHub Release 提供 macOS arm64、Windows amd64、Linux amd64/arm64 构建包，不走 Apple 发行 |
| 替代 | [ADR-005](0005-macos-universal-distribution.md) 全部发行决定；[ADR-006](0006-github-delivery-pipeline.md) 的发行部分 |

## 决定

采用四个原生运行器，分别构建 DMG、NSIS EXE、两种 DEB。macOS 不再构建 Universal/Intel，不需要 Apple 账号、公证或 Developer ID；仅使用 ad-hoc 签名。Windows 不使用 Authenticode 证书。暂不增加 AppImage/RPM 组合，Linux 明确 Ubuntu 24.04 构建基线，不声称全发行版兼容。

保留完整门禁、只读构建、精确来源和最小权限；只有汇总发布 job 写 Release。所有目标成功且校验通过才发布，dev.N 为预发行，稳定/其他后缀保持 Draft。构建架构与人工安装验收分别记录。

## 后果

- 用户按系统和 CPU 下载，不再承担 Universal 双架构包体积。
- 不需要证书或应用商店账号，但 macOS/Windows 可能提示未认证来源。
- Windows/Linux 业务权限同步开启；新增平台差异修复需同样经过测试。
- 四个平台真实安装和界面体验仍需分别验收，CI 成功不代替产品支持认证。
- 发布方式不改变单用户、本地数据、禁止备份迁移恢复的边界。

实施和操作细节以 [发布规范](../RELEASING.md) 为准。
