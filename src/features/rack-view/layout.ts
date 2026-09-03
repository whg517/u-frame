export const U_HEIGHT = 13

export function placementGeometry(startU: number, heightU: number) {
  return {
    bottom: (startU - 1) * U_HEIGHT,
    height: heightU * U_HEIGHT,
  }
}
