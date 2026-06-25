import { RefreshCw } from 'lucide-react'
import type { DependencyStatus } from '../../../../shared/types'
import { Button } from '@renderer/components/ui/button'
import { Panel } from '@renderer/components/ui/panel'

export function Onboarding({
  dependencies,
  onRefresh
}: {
  dependencies: DependencyStatus[]
  onRefresh: () => void
}): React.JSX.Element | null {
  const blocking = dependencies.filter((dependency) => dependency.state === 'missing')
  if (!blocking.length) return null

  return (
    <Panel className="border-amber-500/40 bg-amber-950/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Dependencias pendentes</h2>
          <p className="mt-1 text-sm text-amber-100/70">
            Instale os pacotes do sistema: ffmpeg, v4l2loopback-dkms e v4l-utils.
          </p>
        </div>
        <Button intent="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          Revalidar
        </Button>
      </div>
    </Panel>
  )
}
