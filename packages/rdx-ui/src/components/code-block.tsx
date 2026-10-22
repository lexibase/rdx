import { Children, isValidElement, type ComponentProps } from 'react'

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
      className="my-4 min-w-0 max-w-full overflow-hidden rounded-md bg-secondary text-secondary-foreground"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-1">
        <span className="text-xs text-muted-foreground">
          {language ?? 'Code'}
        </span>
        <CopyCodeButton />
      </div>
      <pre
        tabIndex={0}
        className={cn(
          'm-0 max-w-full overflow-x-auto p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&>code]:bg-transparent [&>code]:rounded-none [&>code]:p-0',
          className
        )}
        {...props}
      >
        {children}
      </pre>
    </div>
  )
}
