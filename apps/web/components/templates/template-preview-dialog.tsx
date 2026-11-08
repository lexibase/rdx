'use client'

import type { ReactNode } from 'react'
import { Button } from '@lexibase/rdx-ui/components/button'
import { CodeBlockCopyButton } from '@lexibase/rdx-ui/components/code-block'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@lexibase/rdx-ui/components/dialog'

export function TemplatePreviewDialog({
  title,
  source,
  children,
}: {
  title: string
  source: string
  children: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" />}>Preview</DialogTrigger>
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[85dvh] sm:max-w-[min(72rem,calc(100%-3rem))]"
        overlayClassName="bg-black/45"
      >
        <DialogHeader className="flex-row flex-wrap items-center justify-between gap-x-4 border-b border-border py-2 pl-4 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Scroll to explore the landing page or copy its source code.
          </DialogDescription>
          <CodeBlockCopyButton size="sm" variant="outline" value={source}>
            Copy code
          </CodeBlockCopyButton>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3 text-foreground sm:px-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
