# UFrame 发布规范

| 属性 | 内容 |
|---|---|
| 文档状态 | Active |
| 版本 | v2.0 |
| 更新日期 | 2026-09-09 |
| 适用范围 | GitHub Release 桌面安装包 |
| 关联文档 | [开发规范](DEVELOPMENT_GUIDE.md) · [GitHub 治理](GITHUB_GOVERNANCE.md) · [ADR-008](adr/0008-platform-release-matrix.md) · [变更记录](../CHANGELOG.md) |

## 1. 分发边界

根据 2026-09-09 的产品决定，不上架 Apple App Store，不使用 Developer ID、Apple notarization 或 Windows Authenticode 凭据。安装包直接由当前 GitHub 仓库的 Release 分发；仓库保持 Private，下载者需要仓库访问权。

macOS 使用无需账号的 ad-hoc 签名，保证 Apple Silicon 包的基本代码完整性；它不是发行者认证，不满足 Apple 公证或 Gatekeeper 信任要求。Windows 同样可能显示 SmartScreen 提示。不得描述为“官方认证”“免警告安装”。

dev 是预发行通道，不是 Rust Debug profile：使用优化 Release 构建，不注册加载开发数据命令。正式稳定版本仍需人工验收，不自动公开。

## 2. 唯一支持矩阵

| 平台 | 架构 | Rust target | 原生运行器 | 安装包 |
|---|---|---|---|---|
| macOS | arm64 | aarch64-apple-darwin | macos-15 | DMG |
| Windows | amd64 | x86_64-pc-windows-msvc | windows-2022 | NSIS EXE |
| Linux | amd64 | x86_64-unknown-linux-gnu | ubuntu-24.04 | DEB |
| Linux | arm64 | aarch64-unknown-linux-gnu | ubuntu-24.04-arm | DEB |

不构建 Intel Mac、Windows arm64、32 位或移动端。Linux 首版覆盖 Ubuntu 24.04 基线及满足包依赖的兼容系统；DEB 不代表所有 Linux 发行版通用。安装使用系统包管理器解析依赖，例如 sudo apt install ./UFrame_VERSION_linux-amd64.deb。Windows 需要 WebView2，安装器使用 Tauri 默认引导方式。

Node.js、Rust 和 pnpm 分别由 .node-version、rust-toolchain.toml 和 packageManager 固定；依赖使用锁文件。GitHub 当前支持 Private 仓库的 Ubuntu arm64 标准运行器，不需要更改可见性或启用付费大型运行器。

## 3. 版本和来源

- 第一版开发候选为 0.1.0-dev.1；后续使用唯一递增的 dev.N（N 从 1 开始）。
- package.json、Cargo.toml、Cargo.lock、tauri.conf.json 四处版本必须一致。
- Tag 必须为 main 上提交的 annotated vMAJOR.MINOR.PATCH[-suffix]，不可移动、覆盖或重用已经发布的版本。
- 只有严格匹配 vMAJOR.MINOR.PATCH-dev.N 的版本自动发布为 Pre-release，latest=false。
- rc、beta 和稳定 tag 只创建 Draft，后续人工验收和发布。
- 版本、完整 Git SHA、四个架构包及 SHA-256 必须可互相追踪。

## 4. 准备与触发

1. 建立发布 Issue，记录版本、范围、已知限制和验收负责人。
2. 独立 worktree 更新四处版本、CHANGELOG；运行 cargo check 更新锁文件。
3. 运行完整 pnpm gate，通过 PR 和四平台试构建后 squash 合并 main。
4. 等待 main CI 通过，在干净 main 再执行版本检查和完整门禁。
5. 创建并仅推送这一 annotated tag：

```bash
git tag -a v0.1.0-dev.1 -m "UFrame v0.1.0-dev.1"
git push origin v0.1.0-dev.1
```

创建 tag 本身不是发行成功；必须等待 Release workflow 和资产复核完成。PR 上的试构建仅产生保留 7 天的 Actions artifacts，不发布 Release。

## 5. 自动执行与权限

[Release workflow](../.github/workflows/release.yml) 使用分离职责：

1. verify-source：只读 macOS job，tag 事件检查版本、annotated tag、main 归属，执行完整 pnpm gate。
2. build：四个只读原生 job；Linux 安装 Tauri 系统依赖，各目标运行 Rust 测试、优化构建，检查可执行文件 Mach-O/PE/ELF 架构，Linux 额外检查 DEB Architecture，macOS 验证 ad-hoc 代码签名。
3. 每个目标必须且只能有一个安装包；写入源码绑定的 manifest 后上传当前 run 的隔离 artifact。
4. publish：仅 tag 事件且四个 build 全部成功才运行；仅本 job 获得 contents: write，GitHub token 仅注入 publish 步骤。不使用 Apple secrets 或发布 environment。
5. 发布入口重新校验 tag，下载本 run 的四个 artifact，拒绝缺包、多包、符号链接、路径越界、版本/源码/目标不一致和摘要错误。全部通过后生成 SHA256SUMS 与 release-manifest.json，再创建 Release。
6. 先创建 Draft 并上传所有文件，再读取 GitHub 资产列表核对名称、数量、大小、上传完成状态与服务端 SHA-256；通过后 dev.N 转为可下载 Pre-release，其余保持 Draft。任何失败保留 Draft，不覆盖已有 Release 或资产。

外部 Action 固定完整 SHA。包不带业务数据库、密钥、用户日志；不改数据库路径，也不实现跨安装数据迁移。

## 6. 下载与验收

标准文件名：UFrame_VERSION_PLATFORM-ARCH.EXT，另附 SHA256SUMS 与 release-manifest.json。必须从 GitHub Release 重新下载，而非直接信任构建目录。

- 核对 tag、manifest commit 和每个下载文件的 SHA-256。
- 验证安装包架构、安装、启动和卸载路径；不能只靠文件名判断架构。
- 检查空库启动、位置/机柜/设备创建、上架与画布、持久化和重启。
- 检查系统主题、两种语言、窗口尺寸与关键鼠标/键盘交互。
- macOS/Windows 的未认证提示属于已知分发限制；不要建议关闭系统级安全防护。
- Linux 记录实际发行版、图形环境和 WebKitGTK 版本。
- 自动化测试/构建通过不等于四平台人工安装和交互验收；未执行的项目必须标注未验收。

正式 Draft 需完成上述验收才能人工发布。dev 包可以提前供测试，但 Release notes 必须说明未完成项和未签名/未公证属性。

## 7. 失败与回滚

任何目标失败都不会发布不完整 Release。未产生 Release 时，网络或托管服务瞬时故障可以重跑原 run；代码修复必须通过新 PR，不移动已推送 tag。已有 Release 时禁止上传覆盖同名资产，使用新的 dev.N。

发布脚本不改业务数据。旧应用回退不等于数据库回滚；先检查 schema 兼容性。产品不提供备份、迁移和恢复功能。

## 8. 官方依据

- [Tauri GitHub 构建](https://v2.tauri.app/distribute/pipelines/github/)
- [Tauri 系统前置依赖](https://v2.tauri.app/start/prerequisites/)
- [Tauri macOS ad-hoc 签名](https://v2.tauri.app/distribute/sign/macos/)
- [GitHub 标准运行器矩阵](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## 9. 变更记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-09-07 | 建立原 macOS Universal 签名公证流程。 |
| v1.1 | 2026-09-09 | 隔离来源验证、签名与摘要复核。 |
| v2.0 | 2026-09-09 | 按用户决定替换为四平台 GitHub Release 安装包，dev 自动预发行、其余 Draft，撤销 Apple 凭据要求。 |
