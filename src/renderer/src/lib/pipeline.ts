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

// ---------------------------------------------------------------------------
// WebGL state — criado uma vez e reutilizado em todos os frames
// ---------------------------------------------------------------------------
interface GlState {
  gl: WebGLRenderingContext
  program: WebGLProgram
  positionBuffer: WebGLBuffer
  texCoordBuffer: WebGLBuffer
  videoTexture: WebGLTexture
  bgTexture: WebGLTexture
  maskTexture: WebGLTexture
  locations: {
    position: number
    texCoord: number
    uVideo: WebGLUniformLocation
    uBackground: WebGLUniformLocation
    uMask: WebGLUniformLocation
    uFeathering: WebGLUniformLocation
    uBgColor: WebGLUniformLocation
    uBgKind: WebGLUniformLocation
  }
}

// WebGL roda num canvas oculto separado do outputCanvas visível,
// evitando conflito com o contexto WebGL interno do MediaPipe.
const glCache = new WeakMap<HTMLCanvasElement, GlState>()
const offscreenCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

const VERT = /* glsl */ `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 v_texCoord;

  uniform sampler2D u_video;
  uniform sampler2D u_background;
  uniform sampler2D u_mask;
  uniform float u_feathering;
  uniform vec3 u_bgColor;
  uniform int u_bgKind; // 0=solid 1=image/video 2=blur(handled on CPU)

  float smoothAlpha(float value, float feathering) {
    float softness = max(0.02, feathering / 100.0);
    float low  = 0.5 - softness;
    float high = 0.5 + softness;
    float t = clamp((value - low) / (high - low), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec2 uv = v_texCoord;
    vec4 person = texture2D(u_video, uv);
    float confidence = texture2D(u_mask, uv).r;
    float alpha = smoothAlpha(confidence, u_feathering);

    vec4 bg;
    if (u_bgKind == 0) {
      bg = vec4(u_bgColor, 1.0);
    } else {
      bg = texture2D(u_background, uv);
    }

    gl_FragColor = mix(bg, person, alpha);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader))
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram()!
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(program))
  }
  return program
}

function createTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function makeBuffer(gl: WebGLRenderingContext, data: Float32Array): WebGLBuffer {
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return buf
}

function getOrCreateGlState(outputCanvas: HTMLCanvasElement, width: number, height: number): GlState | null {
  // Use a separate hidden canvas for WebGL so outputCanvas stays 2D-only
  let hidden = offscreenCache.get(outputCanvas)
  if (!hidden) {
    hidden = document.createElement('canvas')
    hidden.width = width
    hidden.height = height
    hidden.style.display = 'none'
    offscreenCache.set(outputCanvas, hidden)
  } else if (hidden.width !== width || hidden.height !== height) {
    // Resize destroys the WebGL context — recreate
    hidden.width = width
    hidden.height = height
    glCache.delete(hidden)
  }

  if (glCache.has(hidden)) return glCache.get(hidden)!

  const gl = hidden.getContext('webgl', { alpha: false, antialias: false })
  if (!gl) return null

  const program = createProgram(gl)

  // Full-screen quad
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]) // flip Y

  const state: GlState = {
    gl,
    program,
    positionBuffer: makeBuffer(gl, positions),
    texCoordBuffer: makeBuffer(gl, texCoords),
    videoTexture: createTexture(gl),
    bgTexture: createTexture(gl),
    maskTexture: createTexture(gl),
    locations: {
      position: gl.getAttribLocation(program, 'a_position'),
      texCoord: gl.getAttribLocation(program, 'a_texCoord'),
      uVideo: gl.getUniformLocation(program, 'u_video')!,
      uBackground: gl.getUniformLocation(program, 'u_background')!,
      uMask: gl.getUniformLocation(program, 'u_mask')!,
      uFeathering: gl.getUniformLocation(program, 'u_feathering')!,
      uBgColor: gl.getUniformLocation(program, 'u_bgColor')!,
      uBgKind: gl.getUniformLocation(program, 'u_bgKind')!
    }
  }

  glCache.set(hidden, state)
  return state
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converte hex '#rrggbb' para [r, g, b] em 0–1 */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

/** Desenha background de blur no canvas 2D auxiliar e retorna ele como fonte */
const blurCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()

function getBlurCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  if (!blurCache.has(canvas)) {
    blurCache.set(canvas, canvas.getContext('2d')!)
  }
  return blurCache.get(canvas)!
}

// Canvas auxiliar para blur (reutilizado)
let blurCanvas: HTMLCanvasElement | null = null

function renderBlurBg(video: HTMLVideoElement, blurAmount: number, width: number, height: number): HTMLCanvasElement {
  if (!blurCanvas) {
    blurCanvas = document.createElement('canvas')
  }
  blurCanvas.width = width
  blurCanvas.height = height
  const ctx = getBlurCtx(blurCanvas)
  ctx.filter = `blur(${blurAmount}px)`
  ctx.drawImage(video, 0, 0, width, height)
  ctx.filter = 'none'
  return blurCanvas
}

// (mask upload is now done directly from the Uint8Array received from the worker)

// ---------------------------------------------------------------------------
// composeFrame principal
// ---------------------------------------------------------------------------
export function composeFrame(input: ComposeInput): void {
  const { width, height, feathering } = input.settings

  // Redimensiona canvas de saída apenas se necessário
  if (input.outputCanvas.width !== width) input.outputCanvas.width = width
  if (input.outputCanvas.height !== height) input.outputCanvas.height = height

  // Sem máscara: fallback simples 2D
  if (!input.mask || !input.maskWidth || !input.maskHeight) {
    const ctx = input.outputCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(input.video, 0, 0, width, height)
    return
  }

  const state = getOrCreateGlState(input.outputCanvas, width, height)

  // Se WebGL não disponível, cai no path 2D legado
  if (!state) {
    composeFrame2D(input)
    return
  }

  const { gl, program, locations } = state

  gl.viewport(0, 0, width, height)
  gl.useProgram(program)

  // --- Textura do vídeo (pessoa) ---
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, state.videoTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input.video)
  gl.uniform1i(locations.uVideo, 0)

  // --- Textura de background ---
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, state.bgTexture)

  if (input.background.kind === 'solid') {
    const [r, g, b] = hexToRgb(input.background.value as string)
    gl.uniform3f(locations.uBgColor, r, g, b)
    gl.uniform1i(locations.uBgKind, 0)
    // Textura dummy para evitar sampler inválido
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
  } else if (input.background.kind === 'blur') {
    const blurBg = renderBlurBg(input.video, Number(input.background.value) || 18, width, height)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blurBg)
    gl.uniform1i(locations.uBgKind, 1)
  } else if (input.backgroundElement) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input.backgroundElement)
    gl.uniform1i(locations.uBgKind, 1)
  } else {
    gl.uniform3f(locations.uBgColor, 0.067, 0.094, 0.153) // #111827
    gl.uniform1i(locations.uBgKind, 0)
  }

  gl.uniform1i(locations.uBackground, 1)

  // --- Textura da máscara --- (Uint8Array direto do worker: 0=fundo, 255=pessoa)
  const maskData = input.mask instanceof Uint8Array
    ? input.mask
    : (() => {
        const buf = new Uint8Array(input.maskWidth * input.maskHeight)
        for (let i = 0; i < buf.length; i++) buf[i] = Math.round((input.mask as Float32Array)[i] * 255)
        return buf
      })()

  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_2D, state.maskTexture)
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.LUMINANCE,
    input.maskWidth, input.maskHeight, 0,
    gl.LUMINANCE, gl.UNSIGNED_BYTE,
    maskData
  )
  gl.uniform1i(locations.uMask, 2)

  // --- Feathering ---
  gl.uniform1f(locations.uFeathering, feathering)

  // --- Quad ---
  gl.bindBuffer(gl.ARRAY_BUFFER, state.positionBuffer)
  gl.enableVertexAttribArray(locations.position)
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0)

  gl.bindBuffer(gl.ARRAY_BUFFER, state.texCoordBuffer)
  gl.enableVertexAttribArray(locations.texCoord)
  gl.vertexAttribPointer(locations.texCoord, 2, gl.FLOAT, false, 0, 0)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  // Copy result from hidden WebGL canvas to the visible outputCanvas (2D context)
  const hidden = offscreenCache.get(input.outputCanvas)
  if (hidden) {
    const ctx2d = input.outputCanvas.getContext('2d')
    ctx2d?.drawImage(hidden, 0, 0)
  }
}

// ---------------------------------------------------------------------------
// Fallback 2D (caso WebGL indisponível)
// ---------------------------------------------------------------------------
function composeFrame2D(input: ComposeInput): void {
  const { width, height } = input.settings
  const sourceCtx = input.sourceCanvas.getContext('2d', { willReadFrequently: true })
  const personCtx = input.personCanvas.getContext('2d', { willReadFrequently: true })
  const outputCtx = input.outputCanvas.getContext('2d')
  if (!sourceCtx || !personCtx || !outputCtx) return

  input.sourceCanvas.width = width
  input.sourceCanvas.height = height
  input.personCanvas.width = width
  input.personCanvas.height = height

  sourceCtx.drawImage(input.video, 0, 0, width, height)

  // background
  if (input.background.kind === 'solid') {
    outputCtx.fillStyle = input.background.value as string
    outputCtx.fillRect(0, 0, width, height)
  } else if (input.background.kind === 'blur') {
    outputCtx.save()
    outputCtx.filter = `blur(${input.background.value || 18}px)`
    outputCtx.drawImage(input.video, 0, 0, width, height)
    outputCtx.restore()
  } else if (input.backgroundElement) {
    outputCtx.drawImage(input.backgroundElement, 0, 0, width, height)
  } else {
    outputCtx.fillStyle = '#111827'
    outputCtx.fillRect(0, 0, width, height)
  }

  if (!input.mask || !input.maskWidth || !input.maskHeight) {
    outputCtx.drawImage(input.video, 0, 0, width, height)
    return
  }

  const frame = sourceCtx.getImageData(0, 0, width, height)
  const pixels = frame.data
  const xScale = input.maskWidth / width
  const yScale = input.maskHeight / height
  const feathering = input.settings.feathering

  for (let py = 0; py < height; py++) {
    const maskY = Math.min(input.maskHeight - 1, Math.floor(py * yScale))
    for (let px = 0; px < width; px++) {
      const maskX = Math.min(input.maskWidth - 1, Math.floor(px * xScale))
      const maskIndex = maskY * input.maskWidth + maskX
      const pixelIndex = (py * width + px) * 4
      const confidence = input.mask instanceof Float32Array
        ? input.mask[maskIndex]
        : input.mask[maskIndex] / 255
      const softness = Math.max(0.02, feathering / 100)
      const low = 0.5 - softness
      const high = 0.5 + softness
      const t = Math.min(1, Math.max(0, (confidence - low) / (high - low)))
      pixels[pixelIndex + 3] = Math.round(255 * t * t * (3 - 2 * t))
    }
  }

  personCtx.putImageData(frame, 0, 0)
  outputCtx.drawImage(input.personCanvas, 0, 0)
}
