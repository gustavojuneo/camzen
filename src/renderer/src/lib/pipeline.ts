import type { BackgroundAsset, VirtualCameraSettings } from '../../../shared/types'

export interface ComposeInput {
  sourceCanvas: HTMLCanvasElement
  outputCanvas: HTMLCanvasElement
  personCanvas: HTMLCanvasElement
  video: HTMLVideoElement
  background: BackgroundAsset
  backgroundElement: HTMLImageElement | HTMLVideoElement | null
  mask?: Float32Array | Uint8Array
  maskWidth?: number
  maskHeight?: number
  settings: VirtualCameraSettings
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number
): void {
  const rawSourceWidth =
    'videoWidth' in image
      ? image.videoWidth
      : 'displayWidth' in image
        ? image.displayWidth
        : image.width
  const rawSourceHeight =
    'videoHeight' in image
      ? image.videoHeight
      : 'displayHeight' in image
        ? image.displayHeight
        : image.height
  const sourceWidth = Number(rawSourceWidth)
  const sourceHeight = Number(rawSourceHeight)
  if (!sourceWidth || !sourceHeight) return

  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const scaledWidth = sourceWidth * scale
  const scaledHeight = sourceHeight * scale
  const x = (width - scaledWidth) / 2
  const y = (height - scaledHeight) / 2

  context.drawImage(image, x, y, scaledWidth, scaledHeight)
}

function drawBackground(
  context: CanvasRenderingContext2D,
  input: ComposeInput,
  width: number,
  height: number
): void {
  if (input.background.kind === 'solid') {
    context.fillStyle = input.background.value
    context.fillRect(0, 0, width, height)
    return
  }

  if (input.background.kind === 'blur') {
    context.save()
    context.filter = `blur(${input.background.value || 18}px)`
    drawCover(context, input.video, width, height)
    context.restore()
    return
  }

  if (input.backgroundElement) {
    drawCover(context, input.backgroundElement, width, height)
    return
  }

  context.fillStyle = '#111827'
  context.fillRect(0, 0, width, height)
}

function smoothAlpha(value: number, feathering: number): number {
  const softness = Math.max(0.02, feathering / 100)
  const low = 0.5 - softness
  const high = 0.5 + softness
  const normalized = Math.min(1, Math.max(0, (value - low) / (high - low)))

  return normalized * normalized * (3 - 2 * normalized)
}

export function composeFrame(input: ComposeInput): void {
  const { width, height } = input.settings
  const sourceContext = input.sourceCanvas.getContext('2d', { willReadFrequently: true })
  const personContext = input.personCanvas.getContext('2d', { willReadFrequently: true })
  const outputContext = input.outputCanvas.getContext('2d')
  if (!sourceContext || !personContext || !outputContext) return

  input.sourceCanvas.width = width
  input.sourceCanvas.height = height
  input.personCanvas.width = width
  input.personCanvas.height = height
  input.outputCanvas.width = width
  input.outputCanvas.height = height

  sourceContext.drawImage(input.video, 0, 0, width, height)
  drawBackground(outputContext, input, width, height)

  if (!input.mask || !input.maskWidth || !input.maskHeight) {
    outputContext.drawImage(input.video, 0, 0, width, height)
    return
  }

  const frame = sourceContext.getImageData(0, 0, width, height)
  const pixels = frame.data
  const xScale = input.maskWidth / width
  const yScale = input.maskHeight / height

  for (let y = 0; y < height; y += 1) {
    const maskY = Math.min(input.maskHeight - 1, Math.floor(y * yScale))
    for (let x = 0; x < width; x += 1) {
      const maskX = Math.min(input.maskWidth - 1, Math.floor(x * xScale))
      const maskIndex = maskY * input.maskWidth + maskX
      const pixelIndex = (y * width + x) * 4
      const confidence = input.mask instanceof Float32Array ? input.mask[maskIndex] : input.mask[maskIndex] / 255
      pixels[pixelIndex + 3] = Math.round(255 * smoothAlpha(confidence, input.settings.feathering))
    }
  }

  personContext.putImageData(frame, 0, 0)
  outputContext.drawImage(input.personCanvas, 0, 0)
}
