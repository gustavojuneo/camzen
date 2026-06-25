import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

export function FieldLabel({
  label,
  value,
  children
}: {
  label: string
  value?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="grid gap-2 text-sm text-neutral-300">
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        {value ? <span className="text-xs text-neutral-500">{value}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <input
      className={cn(
        'h-10 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 outline-none transition focus:border-cyan-500',
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
  return (
    <select
      className={cn(
        'h-10 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 outline-none transition focus:border-cyan-500',
        className
      )}
      {...props}
    />
  )
}
