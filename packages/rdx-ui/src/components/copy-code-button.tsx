'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from './button'

export function CopyCodeButton() {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const pending = useRef(false)
  const mounted = useRef(false)
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(reset.current)
    }
  }, [])

  async function copy(button: HTMLButtonElement) {
    if (pending.current) return
    pending.current = true
    clearTimeout(reset.current)
    try {
      const code = button.closest('[data-rdx-code-block]')?.querySelector('pre')
      if (!code || !navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code.textContent ?? '')
      if (mounted.current) {
        setStatus('copied')
        reset.current = setTimeout(() => setStatus('idle'), 2000)
      }
    } catch {
      if (mounted.current) setStatus('error')
    } finally {
      pending.current = false
    }
  }

  const Icon = status === 'copied' ? Check : Copy
  return (
    <div className="flex min-w-0 items-center justify-end gap-2">
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          status === 'error' ? 'text-xs text-muted-foreground' : 'sr-only'
        }
      >
        {status === 'copied'
          ? 'Code copied to clipboard.'
          : status === 'error'
            ? 'Could not copy. Select the code and copy it manually.'
            : ''}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        aria-label="Copy code"
        onClick={(event) => copy(event.currentTarget)}
      >
        <Icon aria-hidden="true" className="size-4" />
        {status === 'copied' ? 'Copied' : status === 'error' ? 'Retry' : 'Copy'}
      </Button>
    </div>
  )
}
