import { useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs'
import { FilesetResolver, ImageSegmenter, type ImageSegmenterResult } from '@mediapipe/tasks-vision'
import type { BackgroundAsset, VirtualCameraSettings } from '../../../shared/types'
import { composeFrame } from '@renderer/lib/pipeline'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'

type Delegate = 'GPU' | 'CPU'

async function createSegmenter(delegate: Delegate): Promise<ImageSegmenter> {
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH)

  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate
    },
    runningMode: 'VIDEO',
    outputConfidenceMasks: false,
    outputCategoryMask: true
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
  const frameCountRef = useRef(0)
  const lastFpsAtRef = useRef(performance.now())

  // Reutilizamos o mesmo buffer entre frames para evitar alocação
  const maskBufferRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      if (!enabled) {
        segmenterRef.current?.close()
        segmenterRef.current = null
        setStatus('Segmentacao desligada')
        return
      }

      try {
        setStatus('Inicializando TensorFlow')
        await tf.setBackend('webgl')
        await tf.ready()
        setStatus('Carregando MediaPipe GPU')

        let segmenter: ImageSegmenter
        try {
          segmenter = await createSegmenter('GPU')
        } catch (gpuError) {
          console.warn('MediaPipe GPU failed, falling back to CPU', gpuError)
          setStatus('GPU indisponivel, usando CPU')
          segmenter = await createSegmenter('CPU')
        }

        if (cancelled) {
          segmenter.close()
          return
        }

        segmenterRef.current = segmenter
        setStatus('Segmentacao ativa')
      } catch (caught) {
        console.error('Segmentation failed to load', caught)
        setStatus(
          caught instanceof Error
            ? `Falha ao carregar segmentacao: ${caught.message}`
            : 'Falha ao carregar segmentacao'
        )
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
          const result: ImageSegmenterResult = segmenter.segmentForVideo(video, performance.now())

          // categoryMask: 0 = fundo, 1–5 = partes da pessoa
          // Convertemos para Uint8Array: 0 = fundo, 255 = pessoa
          const categoryMask = result.categoryMask
          const categoryData = categoryMask?.getAsUint8Array()
          const maskWidth = categoryMask?.width
          const maskHeight = categoryMask?.height

          let personMask: Uint8Array | undefined
          if (categoryData && maskWidth && maskHeight) {
            const size = maskWidth * maskHeight
            if (!maskBufferRef.current || maskBufferRef.current.length !== size) {
              maskBufferRef.current = new Uint8Array(size)
            }
            const buf = maskBufferRef.current
            for (let i = 0; i < size; i++) {
              buf[i] = categoryData[i] > 0 ? 255 : 0
            }
            personMask = buf
          }

          composeFrame({
            sourceCanvas,
            personCanvas,
            outputCanvas,
            video,
            background,
            backgroundElement,
            mask: personMask,
            maskWidth,
            maskHeight,
            settings
          })

          categoryMask?.close()
        } else {
          composeFrame({ sourceCanvas, personCanvas, outputCanvas, video, background, backgroundElement, settings })
        }

        frameCountRef.current += 1
        const now = performance.now()
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
  }, [background, backgroundElement, outputCanvasRef, personCanvasRef, settings, sourceCanvasRef, videoRef])

  return { fps, status }
}
