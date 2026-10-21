import type { ComponentProps } from 'react'

import { Separator } from '@lexibase/rdx-ui/components/separator'

export const mdxComponents = {
  h1: (props: ComponentProps<'h1'>) => (
    <h1 className="text-4xl font-bold my-6" {...props} />
  ),
  h2: (props: ComponentProps<'h2'>) => (
    <h2 className="text-2xl font-bold my-6" {...props} />
  ),
  h3: (props: ComponentProps<'h3'>) => (
    <h3 className="text-xl font-bold my-6" {...props} />
  ),
  p: (props: ComponentProps<'p'>) => <p className="my-4" {...props} />,
  ul: (props: ComponentProps<'ul'>) => (
    <ul className="list-disc my-4 ml-6" {...props} />
  ),
  ol: (props: ComponentProps<'ol'>) => (
    <ol className="list-decimal my-4 ml-6" {...props} />
  ),
  li: (props: ComponentProps<'li'>) => (
    <li className="my-2 before:mr-2" {...props} />
  ),
  a: (props: ComponentProps<'a'>) => (
    <a className="underline text-chart-1" {...props} />
  ),
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote
      className="bg-secondary text-muted-foreground border-l-2 pl-4 py-px my-2"
      {...props}
    />
  ),
  pre: (props: ComponentProps<'pre'>) => (
    <pre
      className="bg-secondary text-secondary-foreground rounded-md p-4 my-4 overflow-x-auto"
      {...props}
    />
  ),
  code: (props: ComponentProps<'code'>) => (
    <code
      className="bg-secondary text-secondary-foreground rounded-sm px-1 py-0.5"
      {...props}
    />
  ),

  // Custom
  Separator: (props: ComponentProps<typeof Separator>) => (
    <Separator className="my-8" {...props} />
  ),
}
