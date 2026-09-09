# UFrame 文档索引

## 当前规范

- [产品需求](PRD.md)：产品边界与需求真相源。
- [用户故事](USER_STORIES.md)：用户任务、依赖与行为验收。
- [技术设计](TECHNICAL_DESIGN.md)：实际架构、目标架构和差距。
- [仓库治理](REPOSITORY_GOVERNANCE.md)：文档、代码、脚本、流水线和根文件的执行标准。
- [开发规范](DEVELOPMENT_GUIDE.md)：worktree、门禁和 squash 交付。
- [GitHub 治理](GITHUB_GOVERNANCE.md)：远程权限、自动化与协作。
- [发布规范](RELEASING.md)：版本、签名、公证、Draft 和安装验收。

## 已接受的技术决定

- [ADR-001：SQLx SQLite](adr/0001-sqlx-sqlite.md)
- [ADR-002：Tauri bindings](adr/0002-tauri-specta-bindings.md)
- [ADR-003：shadcn Base UI](adr/0003-shadcn-base-ui.md)
- [ADR-008：四平台 Release 分发](adr/0008-platform-release-matrix.md)（替代 ADR-005 和 ADR-006 的发行部分）
- [ADR-006：GitHub 交付流水线](adr/0006-github-delivery-pipeline.md)
- [ADR-007：纯 Domain 与事务端口](adr/0007-domain-and-transaction-ports.md)

ADR 编号沿用现有记录，不为填补空号生成无决策内容的文档。

## 历史与验收

- [Iteration 016：多平台 dev 发布](iterations/0016-platform-dev-release.md)
- [Iteration 015：CI 修复与依赖集成](iterations/0015-ci-dependency-integration.md)

- [Iteration 014：仓库治理评审](iterations/0014-repository-governance.md)
- [Iteration 013：设计与代码评审](iterations/0013-design-and-code-review.md)
- 更早的范围和验证证据保留在 iterations 目录，以各次记录对应的提交为准。

历史文档不是当前功能完成清单。阅读时先看活动规范，再按需求追溯对应迭代。
