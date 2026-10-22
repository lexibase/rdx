import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'
import { Callout } from './callout'
import { Separator } from '@lexibase/rdx-ui/components/separator'

export const mdxComponents = {
  h1: ({ className, ...props }: ComponentProps<'h1'>) => (
    <h1 className={cn('text-4xl font-bold my-6', className)} {...props} />
  ),
  h2: ({ className, ...props }: ComponentProps<'h2'>) => (
    <h2 className={cn('text-2xl font-bold my-6', className)} {...props} />
  ),
  h3: ({ className, ...props }: ComponentProps<'h3'>) => (
    <h3 className={cn('text-xl font-bold my-6', className)} {...props} />
  ),
  p: ({ className, ...props }: ComponentProps<'p'>) => (
    <p className={cn('my-4', className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<'ul'>) => (
    <ul
      className={cn(
        'list-disc my-4 ml-6 [&.contains-task-list]:list-none [&.contains-task-list]:ml-0',
        className
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentProps<'ol'>) => (
    <ol className={cn('list-decimal my-4 ml-6', className)} {...props} />
  ),
  li: ({ className, ...props }: ComponentProps<'li'>) => (
    <li
      className={cn(
        'my-2 before:mr-2 [&>input[type=checkbox]]:mr-2',
        className
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }: ComponentProps<'a'>) => (
    <a className={cn('underline text-chart-1', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={cn(
        'bg-secondary text-muted-foreground border-l-2 pl-4 py-px my-2',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: ComponentProps<'pre'>) => (
    <pre
      tabIndex={0}
      className={cn(
        'bg-secondary text-secondary-foreground rounded-md p-4 my-4 overflow-x-auto max-w-full focus-visible:outline-2 focus-visible:outline-ring [&>code]:bg-transparent [&>code]:rounded-none [&>code]:p-0',
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentProps<'code'>) => (
    <code
      className={cn(
        'bg-secondary text-secondary-foreground rounded-sm px-1 py-0.5',
        className
      )}
      {...props}
    />
  ),

  h4: ({ className, ...props }: ComponentProps<'h4'>) => (
    <h4 className={cn('text-lg font-semibold my-4', className)} {...props} />
  ),
  h5: ({ className, ...props }: ComponentProps<'h5'>) => (
    <h5 className={cn('text-base font-semibold my-4', className)} {...props} />
  ),
  h6: ({ className, ...props }: ComponentProps<'h6'>) => (
    <h6 className={cn('text-sm font-semibold my-4', className)} {...props} />
  ),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={cn('my-8 border-border', className)} {...props} />
  ),
  img: ({ className, alt = '', ...props }: ComponentProps<'img'>) => (
    <img
      alt={alt}
      className={cn('max-w-full h-auto rounded-md my-4', className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: ComponentProps<'table'>) => (
    <div
      data-slot="mdx-table-scroll"
      role="region"
      aria-label="Table"
      tabIndex={0}
      className="my-6 max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring"
    >
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, scope = 'col', ...props }: ComponentProps<'th'>) => (
    <th
      scope={scope}
      className={cn(
        'border border-border bg-muted/40 px-3 py-2 text-left font-semibold',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentProps<'td'>) => (
    <td
      className={cn('border border-border px-3 py-2 align-top', className)}
      {...props}
    />
  ),
  Callout,
  Separator: ({ className, ...props }: ComponentProps<typeof Separator>) => (
    <Separator
      className={
        typeof className === 'function'
          ? (state) => cn('my-8', className(state))
          : cn('my-8', className)
      }
      {...props}
    />
  ),
}
