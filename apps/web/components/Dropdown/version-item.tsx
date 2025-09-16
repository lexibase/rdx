import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from '@rdx/ui/components/dropdown-menu'
import type { JSX } from 'react'

type VersionItemProps = {
  label: string
  isActive?: boolean
  onSelect: (label: string) => void
  icon: JSX.Element | null
  className?: string
}

export function VersionItem({
  label,
  isActive,
  onSelect,
  icon,
  className = '',
}: VersionItemProps) {
  return (
    <DropdownMenuItem
      key={label}
      onClick={() => onSelect(label)}
      className={`capitalize ${isActive ? 'bg-accent/30 border-1 border-border' : ''} ${className}`}
    >
      {label}
      <DropdownMenuShortcut>{icon}</DropdownMenuShortcut>
    </DropdownMenuItem>
  )
}
