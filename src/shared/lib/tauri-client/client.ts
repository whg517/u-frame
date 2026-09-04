import {
  commands,
  type AppErrorDto,
  type CreateAreaInput,
  type CreateAssetInput,
  type CreateRackInput,
  type CreateRoomInput,
  type PlaceAssetInput,
  type ReorderRacksInput,
} from "./bindings"

type CommandResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: AppErrorDto }

export class CommandError extends Error {
  readonly code: string
  readonly details: AppErrorDto["details"]
  readonly operationId: string

  constructor(error: AppErrorDto) {
    super(error.message)
    this.name = "CommandError"
    this.code = error.code
    this.details = error.details
    this.operationId = error.operationId
  }
}

async function unwrap<T>(result: Promise<CommandResult<T>>): Promise<T> {
  const response = await result
  if (response.status === "error") {
    throw new CommandError(response.error)
  }
  return response.data
}

export const tauriClient = {
  listLocations: () => unwrap(commands.listLocations()),
  createRoom: (input: CreateRoomInput) => unwrap(commands.createRoom(input)),
  createArea: (input: CreateAreaInput) => unwrap(commands.createArea(input)),
  listRacks: (areaId: string | null = null) =>
    unwrap(commands.listRacks(areaId)),
  createRack: (input: CreateRackInput) => unwrap(commands.createRack(input)),
  listAssets: () => unwrap(commands.listAssets()),
  createAsset: (input: CreateAssetInput) => unwrap(commands.createAsset(input)),
  placeAsset: (input: PlaceAssetInput) => unwrap(commands.placeAsset(input)),
  getRackView: (areaId: string | null = null) =>
    unwrap(commands.getRackView(areaId)),
  reorderRacks: (input: ReorderRacksInput) => unwrap(commands.reorderRacks(input)),
  seedDevData: () => unwrap(commands.seedDevData()),
}
