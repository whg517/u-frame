import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { t } from "@/shared/i18n/i18n"
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from "./layout"

export function CanvasZoomControls({
  zoom,
  defaultZoom,
  onZoomOut,
  onReset,
  onZoomIn,
}: {
  zoom: number
  defaultZoom: number
  onZoomOut: () => void
  onReset: () => void
  onZoomIn: () => void
}) {
  return (
    <div className="rack-zoom-controls" role="group" aria-label={t("画布缩放")}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("缩小画布")}
        title={t("缩小")}
        disabled={zoom <= MIN_CANVAS_ZOOM}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-14 font-mono tabular-nums"
        aria-label={t("重置画布缩放到 {defaultZoom}%，当前 {zoom}%", {
          defaultZoom: Math.round(defaultZoom * 100),
          zoom: Math.round(zoom * 100),
        })}
        title={t("重置为默认缩放 {zoom}%", { zoom: Math.round(defaultZoom * 100) })}
        onClick={onReset}
      >
        {Math.round(zoom * 100)}%
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("放大画布")}
        title={t("放大")}
        disabled={zoom >= MAX_CANVAS_ZOOM}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
    </div>
  )
}
