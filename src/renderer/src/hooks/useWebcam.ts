import { useCallback, useEffect, useState } from 'react'
import type { VideoDeviceInfo, VirtualCameraSettings } from '../../../shared/types'

export function useWebcam(settings: VirtualCameraSettings): {
  devices: VideoDeviceInfo[]
  selectedDeviceId: string
  stream: MediaStream | null
  error: string
  refreshDevices: () => Promise<void>
  setSelectedDeviceId: (deviceId: string) => void
} {
  const [devices, setDevices] = useState<VideoDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState('')

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
    void refreshDevices()
  }, [refreshDevices])

  useEffect(() => {
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
            : 'Falha ao abrir webcam. No Wayland, verifique o XDG Desktop Portal.'
        )
      }
    }

    void start()

    return () => {
      cancelled = true
    }
  }, [selectedDeviceId, settings.fps, settings.height, settings.width])

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop())
  }, [stream])

  return { devices, selectedDeviceId, stream, error, refreshDevices, setSelectedDeviceId }
}
