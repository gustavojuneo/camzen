import { useCallback, useEffect, useRef, useState } from 'react'
import type { VirtualCameraSettings, VirtualCameraState } from '../../../shared/types'
import { canvasToRgbPayload } from '@renderer/lib/frameExporter'

export function useVirtualCam(settings: VirtualCameraSettings): {
  state: VirtualCameraState
  start: (canvas: HTMLCanvasElement | null) => Promise<void>
  stop: () => Promise<void>
  loadModule: () => Promise<void>
} {
  const [state, setState] = useState<VirtualCameraState>({
    active: false,
    devicePath: null,
    message: 'Camera virtual inativa'
  })
  const intervalRef = useRef<number | null>(null)
  const statusIntervalRef = useRef<number | null>(null)
  const frameInFlightRef = useRef(false)

  const stopFrameLoop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (statusIntervalRef.current) {
      window.clearInterval(statusIntervalRef.current)
      statusIntervalRef.current = null
    }
    frameInFlightRef.current = false
  }, [])

  const stop = useCallback(async () => {
    stopFrameLoop()
    setState(await window.api.virtualCamera.stop())
  }, [stopFrameLoop])

  const start = useCallback(
    async (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return
      stopFrameLoop()
      setState(await window.api.virtualCamera.start(settings))

      intervalRef.current = window.setInterval(() => {
        if (frameInFlightRef.current) return
        const payload = canvasToRgbPayload(canvas)
        if (!payload) return

        frameInFlightRef.current = true
        void window.api.virtualCamera
          .pushFrame(payload)
          .finally(() => {
            frameInFlightRef.current = false
          })
      }, 1000 / settings.fps)

      statusIntervalRef.current = window.setInterval(() => {
        void window.api.virtualCamera.status().then(setState)
      }, 1000)
    },
    [settings, stopFrameLoop]
  )

  const loadModule = useCallback(async () => {
    setState(await window.api.v4l2.load(settings))
  }, [settings])

  useEffect(() => {
    void window.api.v4l2.status().then(setState)
    return () => {
      stopFrameLoop()
    }
  }, [stopFrameLoop])

  return { state, start, stop, loadModule }
}
