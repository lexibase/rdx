'use client'

import { Archive, Bird, PackageOpen } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type VersionOption = {
  id: string
  label: string
  href: string
  kind: 'live' | 'version' | 'archived'
}

function VersionIcon({ kind }: { kind: VersionOption['kind'] }) {
  const Icon =
    kind === 'live' ? Bird : kind === 'archived' ? Archive : PackageOpen
  return <Icon className="size-4" />
}

/** Uses the same Radix primitives, sizes, icons and states as the showcase. */
export function VersionDropdown({
  options,
  currentId,
  onSelect,
  footer,
}: {
  options: VersionOption[]
  currentId: string
  onSelect?: (id: string) => void
  footer?: ReactNode
}) {
  const current =
    options.find((option) => option.id === currentId) ?? options[0]
  if (!current) return null
  const live = options.filter((option) => option.kind === 'live')
  const active = options.filter((option) => option.kind === 'version')
  const archived = options.filter((option) => option.kind === 'archived')
  const item = (option: VersionOption) => {
    const className = `capitalize ${option.id === current.id ? 'bg-accent/30 border-1 border-border' : ''} ${option.kind === 'archived' ? 'text-muted-foreground line-through' : ''}`
    const content = (
      <>
        {option.label}
        <DropdownMenuShortcut>
          <VersionIcon kind={option.kind} />
        </DropdownMenuShortcut>
      </>
    )
    return onSelect ? (
      <DropdownMenuItem
        key={option.id}
        className={className}
        onSelect={() => onSelect(option.id)}
      >
        {content}
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem key={option.id} className={className} asChild>
        <Link
          href={option.href}
          aria-current={option.id === current.id ? 'true' : undefined}
        >
          {content}
        </Link>
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-rdx-version-trigger
          variant="outline"
          size="sm"
          className="min-w-[134px] capitalize"
          aria-label={`Documentation version: ${current.label}`}
        >
          {current.label}
          <DropdownMenuShortcut
            className={
              current.kind === 'live'
                ? 'text-blue-500'
                : current.kind === 'archived'
                  ? 'text-red-500'
                  : 'text-primary'
            }
          >
            <VersionIcon kind={current.kind} />
          </DropdownMenuShortcut>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" collisionPadding={8}>
        {live.length > 0 && (
          <>
            <DropdownMenuGroup>{live.map(item)}</DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        {active.map(item)}
        {archived.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-center py-px cursor-default">
                Archived
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {archived.map(item)}
            </DropdownMenuGroup>
          </>
        )}
        {footer}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
