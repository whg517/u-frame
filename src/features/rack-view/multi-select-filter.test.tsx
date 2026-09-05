import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MultiSelectFilter } from "./multi-select-filter"

const options = [
  { value: "room-a", label: "上海机房", description: "SH" },
  { value: "room-b", label: "杭州机房", description: "HZ" },
]

describe("MultiSelectFilter", () => {
  it("offers all and individual selections", () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        label="机房"
        allLabel="全部机房"
        options={options}
        values={[]}
        onChange={onChange}
      />,
    )

    expect(screen.getByLabelText("机房筛选：全部机房")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: /上海机房/ }))
    expect(onChange).toHaveBeenCalledWith(["room-a"])
  })

  it("clears a multi-selection through the all option", () => {
    const onChange = vi.fn()
    render(
      <MultiSelectFilter
        label="机房"
        allLabel="全部机房"
        options={options}
        values={["room-a", "room-b"]}
        onChange={onChange}
      />,
    )

    expect(screen.getByLabelText("机房筛选：已选 2 个机房")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("checkbox", { name: "全部机房" }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
