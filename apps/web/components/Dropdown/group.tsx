import type { JSX } from "react";

import { VersionItem } from "./version-item";

type VersionGroupProps = {
  versions: { label: string; icon: string }[];
  isCurrentVersion: (label: string) => boolean;
  getIconByLabel: (label: string) => JSX.Element | null;
  onSelect: (label: string) => void;
  className?: string;
};

export function VersionGroup({
  versions,
  isCurrentVersion,
  getIconByLabel,
  onSelect,
  className,
}: VersionGroupProps) {
  return (
    <>
      {versions.map(({ label, icon }) => (
        <VersionItem
          key={label}
          label={label}
          isActive={isCurrentVersion(label)}
          onSelect={onSelect}
          icon={getIconByLabel(label)}
          iconType={icon}
          className={className}
        />
      ))}
    </>
  );
}
