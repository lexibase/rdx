import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Preserve Base UI state callbacks while merging the shared theme classes. */
export function mergeStateClassName<State>(
  base: string,
  className?: string | ((state: State) => string | undefined)
) {
  return typeof className === 'function'
    ? (state: State) => cn(base, className(state))
    : cn(base, className)
}
