import type { VersionMeta } from '@rdx/rdx-versioning'
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@rdx/ui/components/dropdown-menu'
import type { JSX } from 'react'

type VersionGroupProps = {
  title?: string
  versions: VersionMeta[]
  currentVersion: string
  getIconByLabel: (label: string) => JSX.Element | null
  onSelect: (label: string) => void
  style?: 'active' | 'archived'
}

export function GroupDropdown({
  title,
  versions,
  currentVersion,
  getIconByLabel,
  onSelect,
  style = 'active',
}: VersionGroupProps) {
  const getItemClass = (label: string): string => {
    const isCurrent = currentVersion === label
    if (style === 'archived') {
      return isCurrent
        ? 'bg-red-800/5 border-1 border-red-600/20 text-primary/60 capitalize'
        : 'text-primary/60 capitalize'
    }
    return isCurrent
      ? 'bg-accent/30 border-1 border-border capitalize'
      : 'capitalize'
  }

  return (
    <>
      <DropdownMenuGroup>
        {title && (
          <DropdownMenuLabel className="text-center py-px cursor-default">
            {title}
          </DropdownMenuLabel>
        )}
        {versions.map(({ label }) => (
          <DropdownMenuItem
            key={label}
            onClick={() => onSelect(label)}
            className={`capitalize ${getItemClass(label)}`}
          >
            {style === 'active' ? `Version ${label}` : label}
            <DropdownMenuShortcut>{getIconByLabel(label)}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  )
}
