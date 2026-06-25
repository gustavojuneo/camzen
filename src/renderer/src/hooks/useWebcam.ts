import { useCallback, useEffect, useState } from 'react'
import type { VideoDeviceInfo, VirtualCameraSettings } from '../../../shared/types'

export function useWebcam(settings: VirtualCameraSettings): {
  devices: VideoDeviceInfo[]
  selectedDeviceId: string
  stream: MediaStream | null
  error: string
  cameraEnabled: boolean
  refreshDevices: () => Promise<void>
  setSelectedDeviceId: (deviceId: string) => void
  stopCamera: () => void
  startCamera: () => void
} {
  const [devices, setDevices] = useState<VideoDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [cameraEnabled, setCameraEnabled] = useState(true)

  const refreshDevices = useCallback(async () => {
    try {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const cameras = mediaDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind
        }))
      setDevices(cameras)
      setSelectedDeviceId((current) => current || cameras[0]?.deviceId || '')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nao foi possivel listar cameras')
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshDevices()
    })
  }, [refreshDevices])

  useEffect(() => {
    if (!cameraEnabled) {
      return
    }

    let cancelled = false

    async function start(): Promise<void> {
      if (!selectedDeviceId) return

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: settings.width },
            height: { ideal: settings.height },
            frameRate: { ideal: settings.fps }
          },
          audio: false
        })

        if (cancelled) {
          nextStream.getTracks().forEach((track) => track.stop())
          return
        }

        setError('')
        setStream((current) => {
          current?.getTracks().forEach((track) => track.stop())
          return nextStream
        })
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Falha ao abrir webcam. Verifique permissoes de camera e integracao do desktop.'
        )
      }
    }

    void start()

    return () => {
      cancelled = true
    }
  }, [selectedDeviceId, settings.fps, settings.height, settings.width, cameraEnabled])

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [stream])

  const stopCamera = useCallback(() => {
    setCameraEnabled(false)
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
  }, [])
  const startCamera = useCallback(() => setCameraEnabled(true), [])

  return {
    devices,
    selectedDeviceId,
    stream,
    error,
    cameraEnabled,
    refreshDevices,
    setSelectedDeviceId,
    stopCamera,
    startCamera
  }
}
