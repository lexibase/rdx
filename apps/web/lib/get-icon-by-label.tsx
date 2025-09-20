import type { getParsedVersions } from "@rdx/rdx-versioning";
import { type JSX } from "react";
import { Archive, Bird, PackageOpen } from "lucide-react";

export const iconMap = {
  bird: Bird,
  packageOpen: PackageOpen,
  archive: Archive,
};

const createGetIconByLabel = (
  versions: ReturnType<typeof getParsedVersions> | null,
) => {
  if (!versions) return () => null;

  const all = [versions.canary, ...versions.active, ...versions.archived];
  const versionMap = new Map(all.map((v) => [v.label, v.icon]));

  const getIconByLabel = (label: string): JSX.Element | null => {
    const iconKey = versionMap.get(label);
    const Icon = iconKey ? iconMap[iconKey] : null;
    return Icon ? <Icon className="size-4" /> : null;
  };

  return getIconByLabel;
};

export { createGetIconByLabel };
