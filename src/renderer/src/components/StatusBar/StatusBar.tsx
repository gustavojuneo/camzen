import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react'
import type { DependencyStatus } from '../../../../shared/types'
import { cn } from '@renderer/lib/cn'

const iconByState = {
  ok: CircleCheck,
  warning: CircleDashed,
  missing: CircleAlert
}

export function StatusBar({ dependencies }: { dependencies: DependencyStatus[] }): React.JSX.Element {
  return (
    <div className="flex min-h-12 items-center gap-2 border-t border-neutral-800 bg-neutral-950 px-4">
      {dependencies.map((dependency) => {
        const Icon = iconByState[dependency.state]
        return (
          <div
            key={dependency.key}
            className="flex items-center gap-2 rounded-md bg-neutral-900 px-2 py-1 text-xs text-neutral-300"
            title={dependency.detail}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5',
                dependency.state === 'ok' && 'text-emerald-400',
                dependency.state === 'warning' && 'text-amber-400',
                dependency.state === 'missing' && 'text-rose-400'
              )}
            />
            <span className="font-medium">{dependency.label}</span>
          </div>
        )
      })}
    </div>
  )
}
