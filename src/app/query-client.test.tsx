import { onlineManager, useMutation, useQuery } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { AppProvider } from "./provider"

afterEach(() => onlineManager.setOnline(true))

it("reads and writes local data while offline", async () => {
  onlineManager.setOnline(false)
  const read = vi.fn().mockResolvedValue("本地设备")
  const write = vi.fn().mockResolvedValue(undefined)
  function LocalPage() {
    const query = useQuery({ queryKey: ["offline-regression"], queryFn: read })
    const mutation = useMutation({ mutationFn: write })
    return <><p>{query.data}</p><button onClick={() => mutation.mutate()}>保存</button></>
  }
  render(<AppProvider><LocalPage /></AppProvider>)
  expect(await screen.findByText("本地设备")).toBeInTheDocument()
  fireEvent.click(screen.getByRole("button", { name: "保存" }))
  await waitFor(() => expect(write).toHaveBeenCalledTimes(1))
})
