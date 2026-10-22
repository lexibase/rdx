'use client'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { mergeStateClassName } from '../lib/utils'

function Accordion({
  className,
  multiple = false,
  ...props
}: AccordionPrimitive.Root.Props<string>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      multiple={multiple}
      className={mergeStateClassName(
        'my-4 flex w-full min-w-0 flex-col',
        className
      )}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={mergeStateClassName(
        'min-w-0 border-b border-border last:border-b-0',
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="m-0 flex text-sm font-medium">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={mergeStateClassName(
          'group/accordion-trigger relative flex flex-1 min-w-0 items-start justify-between gap-3 rounded-lg border border-transparent py-2.5 text-left text-sm font-medium text-foreground transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:pointer-events-none data-disabled:opacity-50 motion-reduce:transition-none',
          className
        )}
        {...props}
      >
        <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
        <ChevronDown
          aria-hidden="true"
          data-slot="accordion-trigger-icon"
          className="pointer-events-none ml-auto size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUp
          aria-hidden="true"
          data-slot="accordion-trigger-icon"
          className="pointer-events-none ml-auto hidden size-4 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={mergeStateClassName(
        'min-w-0 overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none',
        className
      )}
      {...props}
    >
      <div className="pt-0 pb-2.5 leading-6 text-foreground/85 [overflow-wrap:anywhere] [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground">
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
