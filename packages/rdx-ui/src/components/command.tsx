'use client'

// shadcn/ui Base Nova Command (cmdk), composed with the Base UI Dialog.
import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { cn } from '../lib/utils'

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex size-full flex-col overflow-hidden rounded-xl bg-popover p-1 text-popover-foreground',
        className
      )}
      {...props}
    />
  )
}
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-2 border-b px-2 py-2 pr-9"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-8 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
}
function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'max-h-[min(50dvh,24rem)] scroll-py-1 overflow-x-hidden overflow-y-auto outline-none',
        className
      )}
      {...props}
    />
  )
}
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(
        'px-4 py-6 text-center text-sm text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}
function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted data-[selected=true]:text-foreground',
        className
      )}
      {...props}
    />
  )
}
export { Command, CommandInput, CommandList, CommandEmpty, CommandItem }
