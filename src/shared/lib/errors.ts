import { CommandError } from "./tauri-client/client"
import { t, type MessageKey } from "@/shared/i18n/i18n"

const messages: Record<string, MessageKey> = {
  "Room.NotFound": "机房不存在或已归档。",
  "Area.NotFound": "区域不存在或已归档。",
  "Area.RoomUnavailable": "所选机房不可用，请重新选择。",
  "Rack.NotFound": "机柜不存在或已归档。",
  "Rack.AreaUnavailable": "所选区域不可用，请重新选择。",
  "Rack.HeightOccupied": "机柜缩容会使已上架设备越界，请先调整设备位置。",
  "Rack.InvalidHeight": "机柜高度必须在 1U 到 100U 之间。",
  "Rack.InvalidPowerCapacity": "额定功率不能为负数。",
  "Rack.InvalidSpecification": "请选择有效的机柜规格。",
  "Rack.SpecificationMismatch": "机柜规格与总 U 数不一致。",
  "Rack.OrderEmpty": "请选择要排序的机柜。",
  "Rack.OrderDuplicate": "机柜排序包含重复项，请刷新后重试。",
  "Rack.OrderUnavailable": "部分机柜已不可用，请刷新后重试。",
  "Asset.NotFound": "设备不存在或已归档。",
  "Asset.InvalidHeight": "设备高度必须在 1U 到 100U 之间。",
  "Asset.InvalidStatus": "请选择有效的设备状态。",
  "Asset.InvalidType": "请选择有效的设备类型。",
  "Placement.AssetNotPlaced": "设备尚未上架，请先选择上架位置。",
  "Placement.AssetUnavailable": "设备已不可用，请刷新后重试。",
  "Placement.RackUnavailable": "目标机柜已不可用，请重新选择。",
  "Placement.BatchEmpty": "没有需要保存的位置调整。",
  "Placement.DuplicateAsset": "同一设备不能重复提交位置调整。",
  "Placement.Unchanged": "设备位置未发生变化。",
  "Database.OperationFailed": "数据操作失败，请重试（{operationId}）。",
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
    const message = messages[error.code]
    return t(message ?? "操作失败（{operationId}）", { operationId: error.operationId })
  }
  return t("操作失败，请重试。")
}
