import { withBasePath } from '@lexibase/rdx-core'
import { Play } from 'lucide-react'
import Image from 'next/image'

export function VideoFirstThumbnail({ basePath }: { basePath?: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/10] flex-col overflow-hidden border-b border-border bg-background"
    >
      <div className="flex h-6 shrink-0 items-center justify-between border-b border-border bg-muted/35 px-2.5 text-[9px] font-medium text-muted-foreground">
        <span>Atlas</span>
        <span>Docs</span>
      </div>
      <div className="grid flex-1 content-center gap-1.5 px-4 py-3 text-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/card:scale-[1.035] sm:px-5">
        <p className="text-sm leading-tight font-semibold tracking-tight">
          Atlas
        </p>
        <p className="text-[9px] leading-tight text-muted-foreground">
          See your API come to life.
        </p>
        <div className="relative mx-auto w-full max-w-44 overflow-hidden rounded-md border border-border bg-muted">
          <Image
            src={withBasePath(
              '/videos/atlas-walkthrough-poster.webp',
              basePath
            )}
            alt=""
            width={640}
            height={360}
            unoptimized
            className="aspect-video w-full object-cover"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-8 place-items-center rounded-full bg-background/90 text-rdx-selected shadow-sm">
              <Play className="size-3 fill-current" />
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
