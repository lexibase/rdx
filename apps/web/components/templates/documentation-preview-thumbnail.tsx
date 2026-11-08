export function DocumentationPreviewThumbnail() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/10] flex-col overflow-hidden border-b border-border bg-background"
    >
      <div className="flex h-6 shrink-0 items-center gap-1 border-b border-border bg-muted/35 px-2.5">
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="ml-auto text-[9px] font-medium text-muted-foreground">
          Docs
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] items-center gap-3 px-4 py-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/card:scale-[1.035] sm:px-5">
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold tracking-tight">
            Build with Atlas.
          </p>
          <div className="mt-2 grid gap-1">
            <span className="h-0.5 w-4/5 rounded-full bg-muted-foreground/30" />
            <span className="h-0.5 w-3/5 rounded-full bg-muted-foreground/25" />
          </div>
          <span className="mt-2.5 inline-flex rounded bg-primary px-1.5 py-1 text-[8px] leading-none font-medium text-primary-foreground">
            Explore the docs
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-background shadow-md [transform:perspective(450px)_rotateY(-14deg)_rotateZ(1deg)]">
          <div className="h-3.5 border-b border-border bg-muted/50" />
          <div className="grid min-h-15 grid-cols-[1fr_2.2fr]">
            <div className="space-y-1 border-r border-border p-1.5">
              <div className="h-1 rounded-sm bg-rdx-highlighting/40" />
              <div className="h-0.5 rounded-full bg-muted-foreground/25" />
              <div className="h-0.5 w-4/5 rounded-full bg-muted-foreground/25" />
            </div>
            <div className="min-w-0 p-1.5">
              <p className="text-[8px] leading-tight font-semibold">
                Getting started
              </p>
              <div className="mt-1 h-0.5 w-4/5 rounded-full bg-muted-foreground/25" />
              <div className="mt-2 h-4 rounded-sm border border-border bg-muted/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
