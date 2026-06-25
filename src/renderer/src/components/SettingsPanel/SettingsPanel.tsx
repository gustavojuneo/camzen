import type { VirtualCameraSettings } from '../../../../shared/types'
import { FieldLabel, Input, Select } from '@renderer/components/ui/field'
import { Panel } from '@renderer/components/ui/panel'

export function SettingsPanel({
  settings,
  onChange
}: {
  settings: VirtualCameraSettings
  onChange: (settings: VirtualCameraSettings) => void
}): React.JSX.Element {
  const update = <Key extends keyof VirtualCameraSettings>(
    key: Key,
    value: VirtualCameraSettings[Key]
  ): void => onChange({ ...settings, [key]: value })

  return (
    <Panel className="grid gap-4 p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Saida</h2>

      <FieldLabel label="Resolucao">
        <Select
          value={`${settings.width}x${settings.height}`}
          onChange={(event) => {
            const [width, height] = event.target.value.split('x').map(Number)
            onChange({ ...settings, width, height })
          }}
        >
          <option value="1280x720">720p</option>
          <option value="1920x1080">1080p</option>
        </Select>
      </FieldLabel>

      <FieldLabel label="FPS" value={`${settings.fps}`}>
        <Input
          min={15}
          max={60}
          step={1}
          type="range"
          value={settings.fps}
          onChange={(event) => update('fps', Number(event.target.value))}
        />
      </FieldLabel>

      <FieldLabel label="Suavizacao" value={`${settings.feathering}`}>
        <Input
          min={0}
          max={20}
          step={1}
          type="range"
          value={settings.feathering}
          onChange={(event) => update('feathering', Number(event.target.value))}
        />
      </FieldLabel>

      <FieldLabel label="Device v4l2">
        <Input value={settings.devicePath} onChange={(event) => update('devicePath', event.target.value)} />
      </FieldLabel>
    </Panel>
  )
}
