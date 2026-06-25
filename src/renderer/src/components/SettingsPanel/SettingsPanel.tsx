import type { VirtualCameraSettings } from '../../../../shared/types'
import { FieldLabel, Input } from '@renderer/components/ui/field'
import { Panel } from '@renderer/components/ui/panel'

export function SettingsPanel({
  settings,
  onChange
}: {
  settings: VirtualCameraSettings
  onChange: (settings: VirtualCameraSettings) => void
}): React.JSX.Element {
  return (
    <Panel className="grid gap-4 p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Saida</h2>
      <FieldLabel label="Device v4l2">
        <Input
          value={settings.devicePath}
          onChange={(event) => onChange({ ...settings, devicePath: event.target.value })}
        />
      </FieldLabel>
    </Panel>
  )
}
