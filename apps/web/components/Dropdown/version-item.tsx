import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@rdx/ui/components/dropdown-menu";
import type { JSX } from "react";

type VersionItemProps = {
  label: string;
  isActive?: boolean;
  onSelect: (label: string) => void;
  icon: JSX.Element | null;
  iconType?: string;
  className?: string;
};

export function VersionItem({
  label,
  isActive,
  onSelect,
  icon,
  iconType,
  className = "",
}: VersionItemProps) {
  const isArchived = iconType === "archive";

  return (
    <DropdownMenuItem
      key={label}
      onClick={() => onSelect(label)}
      className={`capitalize ${isActive ? "bg-accent/30 border-1 border-border" : ""} ${isArchived ? "text-muted-foreground line-through" : ""} ${className}`}
    >
      {label === "canary" ? label : `Version ${label}`}
      <DropdownMenuShortcut>{icon}</DropdownMenuShortcut>
    </DropdownMenuItem>
  );
}
