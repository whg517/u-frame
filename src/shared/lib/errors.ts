import { CommandError } from "./tauri-client/client"

const messages: Record<string, string> = {
  "Validation.Required": "请填写必填项。",
  "Room.CodeConflict": "该机房编码已存在。",
  "Area.CodeConflict": "同一机房内不能使用重复的区域编码。",
  "Area.NameConflict": "同一机房内不能使用重复的区域名称。",
  "Rack.CodeConflict": "同一区域内不能使用重复的机柜编码。",
  "Asset.HostnameConflict": "该主机名已存在。",
  "Asset.IntranetIpConflict": "该内网 IP 已存在。",
  "Asset.SerialNumberConflict": "该序列号已存在。",
  "Asset.InvalidIp": "请输入有效的 IPv4 或 IPv6 地址。",
  "Placement.AssetAlreadyPlaced": "该设备已经上架。",
  "Placement.Overlap": "所选 U 位与已有设备重叠。",
  "Placement.OutOfRange": "设备占用范围超出了机柜容量。",
  "DevData.NotEmpty": "数据库已有业务数据，不能加载开发样例。",
}

export function errorMessage(error: unknown): string {
  if (error instanceof CommandError) {
    return messages[error.code] ?? `操作失败（${error.operationId}）`
  }
  if (error instanceof Error) {
    return error.message
  }
  return "操作失败，请重试。"
}
