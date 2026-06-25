import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, ImageSegmenter, type ImageSegmenterResult } from '@mediapipe/tasks-vision'
import type { BackgroundAsset, VirtualCameraSettings } from '../../../shared/types'
import { composeFrame } from '@renderer/lib/pipeline'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'

async function createSegmenter(delegate: 'GPU' | 'CPU'): Promise<ImageSegmenter> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: 'VIDEO',
    outputConfidenceMasks: true, // float confidence per category
    outputCategoryMask: false
  })
}

export function useSegmentation({
  enabled,
  videoRef,
  sourceCanvasRef,
  outputCanvasRef,
  personCanvasRef,
  background,
  backgroundElement,
  settings
}: {
  enabled: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>
  outputCanvasRef: React.RefObject<HTMLCanvasElement | null>
  personCanvasRef: React.RefObject<HTMLCanvasElement | null>
  background: BackgroundAsset
  backgroundElement: HTMLImageElement | HTMLVideoElement | null
  settings: VirtualCameraSettings
}): { fps: number; status: string } {
  const [fps, setFps] = useState(0)
  const [status, setStatus] = useState('Segmentacao desligada')
  const segmenterRef = useRef<ImageSegmenter | null>(null)
  const maskRef = useRef<{ data: Uint8Array; width: number; height: number } | null>(null)
  // smoothed holds the temporally-blended confidence values (0–1 as float)
  const smoothedRef = useRef<Float32Array | null>(null)
  const maskUploadRef = useRef<Uint8Array | null>(null)
  const frameCountRef = useRef(0)
  const lastFpsAtRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      if (!enabled) {
        segmenterRef.current?.close()
        segmenterRef.current = null
        maskRef.current = null
        setStatus('Segmentacao desligada')
        return
      }

      setStatus('Carregando MediaPipe GPU')
      try {
        let segmenter: ImageSegmenter
        try {
          segmenter = await createSegmenter('GPU')
        } catch {
          setStatus('GPU indisponivel, usando CPU')
          segmenter = await createSegmenter('CPU')
        }

        if (cancelled) {
          segmenter.close()
          return
        }
        segmenterRef.current = segmenter
        setStatus('Segmentacao ativa')
      } catch (e) {
        console.error('Segmentation load error', e)
        setStatus('Falha ao carregar segmentacao')
      }
    }

    void load()
    return () => {
      cancelled = true
      segmenterRef.current?.close()
      segmenterRef.current = null
    }
  }, [enabled])

  useEffect(() => {
    let animationFrame = 0
    let disposed = false

    const draw = (): void => {
      const video = videoRef.current
      const sourceCanvas = sourceCanvasRef.current
      const personCanvas = personCanvasRef.current
      const outputCanvas = outputCanvasRef.current

      if (
        video &&
        sourceCanvas &&
        personCanvas &&
        outputCanvas &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        const segmenter = segmenterRef.current

        if (segmenter) {
          // segmentForVideo reads directly from the video element.
          // MediaPipe uses its own internal WebGL context (separate from outputCanvas).
          const result: ImageSegmenterResult = segmenter.segmentForVideo(video, performance.now())

          // confidenceMasks[0] = background, [1..5] = person parts
          // We combine all person categories: person = 1 - background confidence
          const confidenceMasks = result.confidenceMasks
          const bgMask = confidenceMasks?.[0]

          if (bgMask) {
            const raw = bgMask.getAsFloat32Array()
            const w = bgMask.width
            const h = bgMask.height
            const size = w * h

            if (!smoothedRef.current || smoothedRef.current.length !== size) {
              smoothedRef.current = new Float32Array(size)
              maskUploadRef.current = new Uint8Array(size)
            }

            const smoothed = smoothedRef.current
            const upload = maskUploadRef.current!
            // Temporal smoothing: 65% new frame, 35% previous — reduces flicker on edges
            const ALPHA = 0.65
            for (let i = 0; i < size; i++) {
              const personConf = 1 - raw[i] // invert: bg→0, person→1
              smoothed[i] = ALPHA * personConf + (1 - ALPHA) * smoothed[i]
              upload[i] = (smoothed[i] * 255 + 0.5) | 0
            }

            bgMask.close()
            confidenceMasks.forEach((m, idx) => {
              if (idx > 0) m.close()
            })
            maskRef.current = { data: upload, width: w, height: h }
          }
        }

        const mask = maskRef.current
        composeFrame({
          sourceCanvas,
          personCanvas,
          outputCanvas,
          video,
          background,
          backgroundElement,
          mask: mask?.data,
          maskWidth: mask?.width,
          maskHeight: mask?.height,
          settings
        })

        frameCountRef.current += 1
        const now = performance.now()
        if (lastFpsAtRef.current === 0) {
          lastFpsAtRef.current = now
        }

        if (now - lastFpsAtRef.current >= 1000) {
          setFps(frameCountRef.current)
          frameCountRef.current = 0
          lastFpsAtRef.current = now
        }
      }

      if (!disposed) animationFrame = requestAnimationFrame(draw)
    }

    animationFrame = requestAnimationFrame(draw)
    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
    }
  }, [
    background,
    backgroundElement,
    outputCanvasRef,
    personCanvasRef,
    settings,
    sourceCanvasRef,
    videoRef
  ])

  return { fps, status }
}
