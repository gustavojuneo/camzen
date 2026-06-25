import type { HTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <section className={cn('rounded-lg border border-neutral-800 bg-neutral-950/70', className)} {...props} />
}
