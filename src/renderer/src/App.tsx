import { FlipHorizontal, RefreshCw, Video, VideoOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DependencyStatus, VirtualCameraSettings } from '../../shared/types'
import { BackgroundSelector } from '@renderer/components/BackgroundSelector/BackgroundSelector'
import { CameraPreview } from '@renderer/components/CameraPreview/CameraPreview'
import { Onboarding } from '@renderer/components/Onboarding/Onboarding'
import { SettingsPanel } from '@renderer/components/SettingsPanel/SettingsPanel'
import { StatusBar } from '@renderer/components/StatusBar/StatusBar'
import { Button } from '@renderer/components/ui/button'
import { Select } from '@renderer/components/ui/field'
import { useBackgrounds } from '@renderer/hooks/useBackgrounds'
import { useWebcam } from '@renderer/hooks/useWebcam'

function App(): React.JSX.Element {
  const {
    preferences,
    selectedBackground,
    setSelectedBackgroundId,
    addBackground,
    removeBackground,
    setPreferences
  } = useBackgrounds()
  const [dependencies, setDependencies] = useState<DependencyStatus[]>([])
  const [mirrorHorizontal, setMirrorHorizontal] = useState(false)
  const settings = preferences.settings
  const webcam = useWebcam(settings)

  const refreshDependencies = useCallback(() => {
    void window.api.dependencies.check().then(setDependencies)
  }, [])

  useEffect(() => {
    refreshDependencies()
  }, [refreshDependencies])

  const cameraOptions = useMemo(
    () =>
      webcam.devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label}
        </option>
      )),
    [webcam.devices]
  )

  const updateSettings = (nextSettings: VirtualCameraSettings): void => {
    setPreferences({ ...preferences, settings: nextSettings })
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-neutral-950 text-neutral-100">
      <header className="flex h-16 items-center justify-between border-b border-neutral-800 px-5">
        <div>
          <h1 className="text-base font-semibold">Camzen</h1>
          <p className="text-xs text-neutral-500">Linux Wayland + KDE, MediaPipe e v4l2loopback</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-72"
            value={webcam.selectedDeviceId}
            onChange={(event) => webcam.setSelectedDeviceId(event.target.value)}
            disabled={!webcam.cameraEnabled}
          >
            {cameraOptions.length ? (
              cameraOptions
            ) : (
              <option value="">Nenhuma camera encontrada</option>
            )}
          </Select>
          <Button
            intent="ghost"
            size="icon"
            title="Atualizar cameras"
            onClick={webcam.refreshDevices}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            intent={mirrorHorizontal ? 'secondary' : 'ghost'}
            size="icon"
            title={mirrorHorizontal ? 'Enviar camera espelhada' : 'Enviar camera sem espelhamento'}
            aria-pressed={mirrorHorizontal}
            onClick={() => setMirrorHorizontal((current) => !current)}
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>
          <Button
            intent={webcam.cameraEnabled ? 'secondary' : 'ghost'}
            size="icon"
            title={webcam.cameraEnabled ? 'Desligar camera' : 'Ligar camera'}
            onClick={webcam.cameraEnabled ? webcam.stopCamera : webcam.startCamera}
          >
            {webcam.cameraEnabled ? (
              <Video className="h-4 w-4" />
            ) : (
              <VideoOff className="h-4 w-4 text-rose-400" />
            )}
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 grid-cols-[1fr_360px] gap-4 p-4">
        <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4">
          <Onboarding dependencies={dependencies} onRefresh={refreshDependencies} />
          {webcam.error ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-100">
              {webcam.error}
            </div>
          ) : null}
          <CameraPreview
            stream={webcam.stream}
            background={selectedBackground}
            settings={settings}
            mirrorHorizontal={mirrorHorizontal}
          />
        </div>

        <aside className="grid min-h-0 content-start gap-4 overflow-y-auto">
          <BackgroundSelector
            backgrounds={preferences.backgrounds}
            selectedId={preferences.selectedBackgroundId}
            onSelect={setSelectedBackgroundId}
            onAdd={addBackground}
            onRemove={removeBackground}
          />
          <SettingsPanel settings={settings} onChange={updateSettings} />
        </aside>
      </main>

      <StatusBar dependencies={dependencies} />
    </div>
  )
}

export default App
