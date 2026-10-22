import { Children, isValidElement, type ComponentProps } from 'react'
import { CodeXml } from 'lucide-react'

import { cn } from '../lib/utils'
import { CopyCodeButton } from './copy-code-button'

/** Keep the code server-rendered; only clipboard interaction needs JavaScript. */
export function CodeBlock({
  children,
  className,
  ...props
}: ComponentProps<'pre'>) {
  const code = Children.toArray(children).find(
    (child) =>
      isValidElement<{ className?: string }>(child) &&
      child.props.className?.includes('language-')
  )
  const language = isValidElement<{ className?: string }>(code)
    ? code.props.className?.match(/(?:^|\s)language-([^\s]+)/)?.[1]
    : undefined
  return (
    <div
      data-rdx-code-block
      className="my-4 min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-muted/30 text-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-border/70 bg-muted/30 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400"
          >
            <CodeXml className="size-3.5" />
          </span>
          <span
            className="min-w-0 truncate font-mono text-xs font-medium text-muted-foreground"
            title={language}
          >
            {language ?? 'Code'}
          </span>
        </div>
        <CopyCodeButton />
      </div>
      <pre
        tabIndex={0}
        className={cn(
          'm-0 max-w-full overflow-x-auto p-3 font-mono text-[13px] leading-6 text-foreground/90 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&>code]:bg-transparent [&>code]:rounded-none [&>code]:p-0 [&>code]:[font-family:inherit] [&>code]:text-inherit',
          className
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}
