import { getMessages } from '../lib/i18n'
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react'

import { cn } from '../lib/utils'
import { MdxImage } from './mdx-image'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion'
import { Blockquote } from './blockquote'
import { Callout } from './callout'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from './code-block'
import { MdxCodeBlock } from './mdx-code-block'
import { Kbd, KbdGroup } from './kbd'
import { HeadingPermalink } from './heading-permalink'
import { MdxKeyboardShortcut } from './mdx-keyboard-shortcut'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Steps, Step, StepTitle } from './steps'
import { Separator } from '@lexibase/rdx-ui/components/separator'

function linkedImages(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; zoom?: boolean }>(child))
      return child
    if (child.type === MdxImage) return cloneElement(child, { zoom: false })
    return child.props.children
      ? cloneElement(child, {}, linkedImages(child.props.children))
      : child
  })
}

function MdxTable({ lang, className, ...props }: ComponentProps<'table'>) {
  return (
    <Table
      containerProps={{
        'data-slot': 'mdx-table-scroll',
        role: 'region',
        'aria-label': getMessages(lang).table,
        tabIndex: 0,
        className:
          'my-6 min-w-0 max-w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      }}
      className={className}
      {...props}
    />
  )
}

function containsLink(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ href?: string; children?: ReactNode }>(child) &&
      (child.type === 'a' ||
        child.props.href !== undefined ||
        containsLink(child.props.children))
  )
}

function heading(Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', styles: string) {
  return function MdxHeading({
    className,
    children,
    id,
    ...props
  }: ComponentProps<'h2'>) {
    const title = <span data-rdx-heading-text>{children}</span>
    return (
      <Tag
        id={id}
        className={cn('group/mdx-heading', styles, className)}
        {...props}
      >
        {id && !containsLink(children) ? (
          <HeadingPermalink key={id} id={id}>
            {title}
          </HeadingPermalink>
        ) : (
          title
        )}
      </Tag>
    )
  }
}

export const mdxComponents = {
  h1: heading('h1', 'text-4xl font-bold my-6'),
  h2: heading('h2', 'text-2xl font-bold my-6'),
  h3: heading('h3', 'text-xl font-bold my-6'),
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
  a: ({ className, children, ...props }: ComponentProps<'a'>) => (
    <a className={cn('underline text-rdx-highlighting', className)} {...props}>
      {linkedImages(children)}
    </a>
  ),
  blockquote: Blockquote,
  pre: MdxCodeBlock,
  code: ({ className, ...props }: ComponentProps<'code'>) => (
    <code
      className={cn(
        'bg-secondary text-secondary-foreground rounded-sm px-1 py-0.5',
        className
      )}
      {...props}
    />
  ),

  h4: heading('h4', 'text-lg font-semibold my-4'),
  h5: heading('h5', 'text-base font-semibold my-4'),
  h6: heading('h6', 'text-sm font-semibold my-4'),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={cn('my-8 border-border', className)} {...props} />
  ),
  img: MdxImage,
  table: MdxTable,
  thead: TableHeader,
  tbody: TableBody,
  tfoot: TableFooter,
  tr: TableRow,
  caption: TableCaption,
  th: ({ className, scope = 'col', ...props }: ComponentProps<'th'>) => (
    <TableHead scope={scope} className={className} {...props} />
  ),
  td: TableCell,
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
  Kbd,
  KbdGroup,
  KeyboardShortcut: MdxKeyboardShortcut,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  Callout,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Steps,
  Step,
  StepTitle,
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

/** Bind server-rendered MDX labels to the same locale as interactive components. */
export function getMdxComponents(lang?: string) {
  return {
    ...mdxComponents,
    KeyboardShortcut: (props: { children?: ReactNode }) => (
      <MdxKeyboardShortcut {...props} lang={lang} />
    ),
    pre: (props: ComponentProps<'pre'>) => (
      <MdxCodeBlock {...props} lang={lang} />
    ),
    table: (props: ComponentProps<'table'>) => (
      <MdxTable {...props} lang={lang} />
    ),
  }
}
