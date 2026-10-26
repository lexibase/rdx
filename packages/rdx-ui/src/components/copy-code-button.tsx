'use client'

import { useMessages } from '../providers/locale-provider'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from './button'

export function CopyCodeButton() {
  const messages = useMessages()
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
          ? messages.codeCopied
          : status === 'error'
            ? messages.copyCodeError
            : ''}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        data-status={status}
        className="size-7 shrink-0 border-border/70 bg-background/60 p-0 text-muted-foreground shadow-none hover:text-foreground data-[status=copied]:border-emerald-500/30 data-[status=copied]:bg-emerald-500/10 data-[status=copied]:text-emerald-700 dark:data-[status=copied]:text-emerald-400 data-[status=error]:border-amber-500/30 [&>svg]:size-3.5"
        aria-label={messages.copyCode}
        title={
          status === 'copied'
            ? messages.copied
            : status === 'error'
              ? messages.copyRetry
              : messages.copyCode
        }
        onClick={(event) => copy(event.currentTarget)}
      >
        <Icon aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}
