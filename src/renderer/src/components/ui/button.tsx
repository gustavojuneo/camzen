import type { ButtonHTMLAttributes } from 'react'
import { tv, type VariantProps } from 'tailwind-variants'
import { cn } from '@renderer/lib/cn'

const button = tv({
  base: 'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50',
  variants: {
    intent: {
      primary: 'bg-cyan-500 text-neutral-950 hover:bg-cyan-400',
      secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
      ghost: 'text-neutral-300 hover:bg-neutral-800 hover:text-neutral-50',
      danger: 'bg-rose-600 text-white hover:bg-rose-500'
    },
    size: {
      sm: 'h-8 px-2 text-xs',
      md: 'h-10 px-3',
      icon: 'h-10 w-10 px-0'
    }
  },
  defaultVariants: {
    intent: 'secondary',
    size: 'md'
  }
})

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>

export function Button({ className, intent, size, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(button({ intent, size }), className)} {...props} />
}
