'use client'

import type { ComponentProps } from 'react'

import { formatMessage } from '../lib/i18n'
import { cn } from '../lib/utils'
import { useMessages } from '../providers/locale-provider'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog'

/** Markdown images keep their normal appearance and use shadcn Dialog to expand. */
export function MdxImage({
  className,
  alt = '',
  zoom = true,
  ...props
}: ComponentProps<'img'> & { zoom?: boolean }) {
  const messages = useMessages()
  const image = (
    <img
      {...props}
      alt={alt}
      className={cn('max-w-full h-auto rounded-md my-4', className)}
    />
  )
  // Decorative images and images inside links retain their original semantics.
  if (!zoom || !alt.trim() || !props.src) return image
  return (
    <Dialog>
      <DialogTrigger
        data-rdx-image-trigger
        aria-label={formatMessage(messages.enlargeImage, { alt })}
        title={formatMessage(messages.enlargeImage, { alt })}
        render={
          <Button
            variant="ghost"
            className="h-auto max-w-full cursor-zoom-in p-0 align-middle hover:bg-transparent dark:hover:bg-transparent"
          />
        }
      >
        {image}
      </DialogTrigger>
      <DialogContent
        data-rdx-image-dialog
        closeLabel={messages.closeImage}
        overlayClassName="bg-black/70"
        className="flex max-h-[calc(100dvh-2rem)] w-max max-w-[calc(100vw-2rem)] flex-col gap-0 p-2 sm:max-w-[calc(100vw-4rem)] [&>[data-slot=dialog-close]]:bg-popover/90"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          {messages.imagePreviewDescription}
        </DialogDescription>
        <img
          src={props.src}
          srcSet={props.srcSet}
          sizes={props.srcSet ? 'calc(100vw - 4rem)' : undefined}
          crossOrigin={props.crossOrigin}
          referrerPolicy={props.referrerPolicy}
          alt={alt}
          loading="eager"
          decoding="async"
          className="h-auto max-h-[calc(100dvh-4rem)] w-auto max-w-full self-center rounded-md object-contain"
        />
      </DialogContent>
    </Dialog>
  )
}
