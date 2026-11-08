export function CodeInFocusThumbnail() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[16/10] flex-col overflow-hidden border-b border-border bg-background"
    >
      <div className="flex h-6 shrink-0 items-center justify-between border-b border-border bg-muted/35 px-2.5 text-[9px] font-medium text-muted-foreground">
        <span>Atlas</span>
        <span>Docs</span>
      </div>
      <div className="grid flex-1 grid-cols-[0.9fr_1.1fr] items-center gap-3 px-4 py-5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/card:scale-[1.035] sm:px-5">
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold tracking-tight">
            Your first API, in minutes.
          </p>
          <div className="mt-2 h-0.5 w-4/5 rounded-full bg-muted-foreground/30" />
          <span className="mt-2.5 inline-flex rounded bg-primary px-1.5 py-1 text-[8px] leading-none font-medium text-primary-foreground">
            Get started
          </span>
        </div>
        <div className="min-w-0 overflow-hidden rounded-md border border-border bg-muted/30">
          <div className="border-b border-border px-2 py-1.5 font-mono text-[8px] text-muted-foreground">
            server.ts
          </div>
          <div className="space-y-1 px-2 py-2.5 font-mono text-[8px] whitespace-nowrap">
            <div className="text-violet-700 dark:text-violet-300">import</div>
            <div>createServer(() =&gt; {'{'}</div>
            <div className="ps-2 text-emerald-700 dark:text-emerald-300">
              &apos;Hello from Atlas!&apos;
            </div>
            <div>{'})'}</div>
            <div>server.listen(3000)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
