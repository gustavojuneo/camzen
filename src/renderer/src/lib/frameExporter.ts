import type { FramePayload } from '../../../shared/types'

export function canvasToRgbaPayload(canvas: HTMLCanvasElement): FramePayload | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  // imageData.data is a Uint8ClampedArray that may share a larger ArrayBuffer
  // with a byteOffset. Copy into a plain Uint8Array so the buffer is standalone.
  const data = new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength)

  return { width: canvas.width, height: canvas.height, data: data.buffer }
}

/** @deprecated use canvasToRgbaPayload */
export function canvasToRgbPayload(canvas: HTMLCanvasElement): FramePayload | null {
  return canvasToRgbaPayload(canvas)
}
