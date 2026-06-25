import { Camera, Play, Square } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { BackgroundAsset, VirtualCameraSettings } from '../../../../shared/types'
import { useBackgroundElement } from '@renderer/hooks/useBackgroundElement'
import { useSegmentation } from '@renderer/hooks/useSegmentation'
import { useVirtualCam } from '@renderer/hooks/useVirtualCam'
import { Button } from '@renderer/components/ui/button'
import { Panel } from '@renderer/components/ui/panel'

export function CameraPreview({
  stream,
  background,
  settings
}: {
  stream: MediaStream | null
  background: BackgroundAsset
  settings: VirtualCameraSettings
}): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const personCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const outputCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const segmentationEnabled = background.kind !== 'none'
  const backgroundElement = useBackgroundElement(background)
  const virtualCam = useVirtualCam(settings)
  const { fps, status } = useSegmentation({
    enabled: segmentationEnabled,
    videoRef,
    sourceCanvasRef,
    personCanvasRef,
    outputCanvasRef,
    background,
    backgroundElement,
    settings
  })

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <Panel className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-100">
          <Camera className="h-4 w-4 text-cyan-400" />
          Preview processado
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span>{fps} fps</span>
          <span className="h-1 w-1 rounded-full bg-neutral-600" />
          <span>{status}</span>
        </div>
      </div>

      <div className="grid min-h-0 place-items-center bg-neutral-950 p-4">
        {/* Video visível apenas no modo "Sem filtro" */}
        <video
          ref={videoRef}
          className={`aspect-video max-h-full w-full max-w-full rounded-md bg-neutral-900 object-contain${segmentationEnabled ? ' hidden' : ''}`}
          autoPlay
          muted
          playsInline
        />
        {/* Canvas visível apenas com segmentação ativa */}
        <canvas
          ref={outputCanvasRef}
          className={`aspect-video max-h-full w-full max-w-full rounded-md bg-neutral-900 object-contain${segmentationEnabled ? '' : ' hidden'}`}
          width={settings.width}
          height={settings.height}
        />
        <canvas ref={sourceCanvasRef} className="hidden" />
        <canvas ref={personCanvasRef} className="hidden" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-800 px-4 py-3">
        <div className="min-w-0 text-sm text-neutral-400">{virtualCam.state.message}</div>
        <div className="flex shrink-0 items-center gap-2">
          {virtualCam.state.active ? (
            <Button intent="danger" onClick={virtualCam.stop}>
              <Square className="h-4 w-4" />
              Parar
            </Button>
          ) : (
            <Button intent="primary" onClick={() => virtualCam.start(outputCanvasRef.current)}>
              <Play className="h-4 w-4" />
              Iniciar
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )
}
