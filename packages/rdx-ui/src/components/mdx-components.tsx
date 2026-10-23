import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'
import { Blockquote } from './blockquote'
import { Callout } from './callout'
import { CodeBlock } from './code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
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
    <a
      className={cn('underline text-chart-1 text-blue-500', className)}
      {...props}
    />
  ),
  blockquote: Blockquote,
  pre: CodeBlock,
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
      className="my-6 min-w-0 max-w-full overflow-x-auto rounded-lg border border-border bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table
        className={cn(
          'w-full border-separate border-spacing-0 text-sm [&_tbody>tr]:transition-colors motion-reduce:[&_tbody>tr]:transition-none [&_tbody>tr:nth-child(even)]:bg-muted/20 [&_tbody>tr:hover]:bg-muted/40 [&_tbody>tr:last-child>td]:border-b-0',
          className
        )}
        {...props}
      />
    </div>
  ),
  th: ({ className, scope = 'col', ...props }: ComponentProps<'th'>) => (
    <th
      scope={scope}
      className={cn(
        'border-b border-r border-border bg-muted/40 px-4 py-3 text-left text-xs font-semibold tracking-wide text-foreground/90 last:border-r-0',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: ComponentProps<'td'>) => (
    <td
      className={cn(
        'min-w-40 border-b border-r border-border/70 px-4 py-3 align-top leading-6 last:border-r-0',
        className
      )}
      {...props}
    />
  ),
  Callout,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
