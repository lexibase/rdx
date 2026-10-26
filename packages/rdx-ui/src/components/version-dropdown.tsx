'use client'

import { useMessages } from '../providers/locale-provider'

import { Archive, Bird, PackageOpen } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { formatMessage } from '../lib/i18n'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLinkItem,
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

/** Shared version menu for the runtime and development showcase. */
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
  const messages = useMessages()
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
        onClick={() => onSelect(option.id)}
      >
        {content}
      </DropdownMenuItem>
    ) : (
      <DropdownMenuLinkItem
        key={option.id}
        className={className}
        closeOnClick
        render={<Link href={option.href} />}
        aria-current={option.id === current.id ? 'true' : undefined}
      >
        {content}
      </DropdownMenuLinkItem>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-rdx-version-trigger
            variant="outline"
            size="sm"
            className="min-w-0 capitalize sm:min-w-[134px]"
            aria-label={formatMessage(messages.documentationVersion, {
              version: current.label,
            })}
          />
        }
      >
        {current.label}
        <DropdownMenuShortcut
          className={`ml-0 sm:ml-auto ${
            current.kind === 'live'
              ? 'text-blue-500'
              : current.kind === 'archived'
                ? 'text-red-500'
                : 'text-primary'
          }`}
        >
          <VersionIcon kind={current.kind} />
        </DropdownMenuShortcut>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" collisionPadding={8}>
        {live.length > 0 && (
          <>
            <DropdownMenuGroup>{live.map(item)}</DropdownMenuGroup>
            {(active.length > 0 || archived.length > 0 || Boolean(footer)) && (
              <DropdownMenuSeparator />
            )}
          </>
        )}
        {active.map(item)}
        {archived.length > 0 && (
          <>
            {active.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-center py-px cursor-default">
                {messages.archived}
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
