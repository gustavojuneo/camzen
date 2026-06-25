import type { FramePayload } from '../../../shared/types'

export function canvasToRgbPayload(canvas: HTMLCanvasElement): FramePayload | null {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const rgba = imageData.data
  const rgb = new Uint8Array(canvas.width * canvas.height * 3)

  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 3) {
    rgb[target] = rgba[source]
    rgb[target + 1] = rgba[source + 1]
    rgb[target + 2] = rgba[source + 2]
  }

  return {
    width: canvas.width,
    height: canvas.height,
    data: rgb.buffer
  }
}
