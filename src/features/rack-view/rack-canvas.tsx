import type { CSSProperties } from "react"

import type { RackCanvasDto, RackPlacementViewDto } from "@/shared/lib/tauri-client/bindings"
import { U_HEIGHT, placementGeometry } from "./layout"
import "./rack-canvas.css"

export function RackCanvas({
  racks,
  selectedAssetId,
  onSelectAsset,
}: {
  racks: RackCanvasDto[]
  selectedAssetId: string | null
  onSelectAsset: (asset: RackPlacementViewDto) => void
}) {
  return (
    <div className="rack-stage min-h-full min-w-max p-8 lg:p-10" aria-label="机柜画布">
      <div className="flex items-end gap-12">
        {racks.map(({ rack, placements }) => (
          <section className="rack-frame" key={rack.id} aria-label={`${rack.code}，${rack.totalU}U`}>
            <header className="mb-3 pl-[34px] text-center">
              <p className="font-mono text-sm font-semibold">{rack.code}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{rack.roomName} / {rack.areaName}</p>
            </header>
            <div className="rack-cap" aria-hidden="true" />
            <div className="rack-body" style={{ height: rack.totalU * U_HEIGHT }}>
              <div className="rack-grid" aria-hidden="true" />
              {Array.from({ length: rack.totalU }, (_, index) => index + 1).map((unit) => (
                <span
                  className="rack-unit-label"
                  key={unit}
                  style={{ bottom: (unit - 1) * U_HEIGHT }}
                  aria-hidden="true"
                >
                  {unit}
                </span>
              ))}
              {placements.map((placement) => {
                const geometry = placementGeometry(placement.startU, placement.heightU)
                return (
                  <button
                    type="button"
                    className="rack-device"
                    data-selected={placement.assetId === selectedAssetId}
                    key={placement.placementId}
                    style={{ bottom: geometry.bottom, height: geometry.height } as CSSProperties}
                    title={`${placement.name} · U${placement.startU}–U${placement.endU}`}
                    aria-label={`${placement.name}，U${placement.startU} 到 U${placement.endU}`}
                    onClick={() => onSelectAsset(placement)}
                  >
                    <span className="rack-device-handle" aria-hidden="true" />
                    <span className="rack-device-label">{placement.name}</span>
                    <span className="rack-device-handle" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            <div className="rack-foot" aria-hidden="true" />
          </section>
        ))}
      </div>
    </div>
  )
}
