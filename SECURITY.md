# 安全策略

## 支持范围

UFrame 尚未发布稳定版本，`main` 是唯一长期主线。安全修复应用于 `main`；历史开发快照不提供长期支持。正式版本发布后，本节将按实际支持窗口更新，不预设不存在的发布分支。

## 私密报告漏洞

当前仓库是 Private，[GitHub 面向外部报告者的 Private Vulnerability Reporting 仅适用于 Public 仓库](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting)，因此不声明该入口已启用。请通过已有私密沟通渠道联系仓库所有者 `whg517`；不要创建普通 Issue，也不要上传包含真实设备标识、IP、SN、数据库、证书或用户目录的附件。

报告应尽量包含：

- 受影响版本或完整提交 SHA。
- 影响范围和攻击前提。
- 最小复现步骤或脱敏的概念验证。
- 已验证的缓解方式。
- 是否已向其他项目或人员披露。

维护者将确认一个双方可访问的私密协作渠道，评估严重性并协调修复和披露。未经协商，请不要公开利用细节。

## 不属于漏洞报告的内容

一般功能缺陷、易用性问题、缺少功能和不包含安全影响的崩溃，请使用普通 Issue 模板。
