import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from "./layout"

export function CanvasZoomControls({
  zoom,
  onZoomOut,
  onReset,
  onZoomIn,
}: {
  zoom: number
  onZoomOut: () => void
  onReset: () => void
  onZoomIn: () => void
}) {
  return (
    <div className="rack-zoom-controls" role="group" aria-label="画布缩放">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="缩小画布"
        title="缩小"
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
        aria-label={`重置画布缩放，当前 ${Math.round(zoom * 100)}%`}
        title="重置为 100%"
        onClick={onReset}
      >
        {Math.round(zoom * 100)}%
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="放大画布"
        title="放大"
        disabled={zoom >= MAX_CANVAS_ZOOM}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
    </div>
  )
}
