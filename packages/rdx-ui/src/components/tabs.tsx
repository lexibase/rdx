'use client'

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'

import { mergeStateClassName } from '../lib/utils'

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={mergeStateClassName(
        'my-6 min-w-0 max-w-full rounded-lg border border-border bg-muted/20 text-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={mergeStateClassName(
        'flex min-w-0 gap-1 overflow-x-auto rounded-t-lg border-b border-border bg-muted/30 p-2 data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={mergeStateClassName(
        'relative shrink-0 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-active:border-border data-active:bg-background data-active:text-foreground data-active:shadow-xs data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent data-disabled:hover:text-muted-foreground motion-reduce:transition-none',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={mergeStateClassName(
        'min-w-0 rounded-b-lg p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5 [&>:first-child]:mt-0 [&>:last-child]:mb-0',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
