import type { getParsedVersions } from "@rdx/rdx-versioning";
import { Button } from "@rdx/ui/components/button";
import {
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@rdx/ui/components/dropdown-menu";
import type { JSX } from "react";

export function DropdownTrigger({
  version,
  versions,
  getIconByLabel,
}: {
  version: string;
  versions: ReturnType<typeof getParsedVersions>;
  getIconByLabel: (label: string) => JSX.Element | null;
}) {
  const colorClass =
    version === "canary"
      ? "text-blue-500"
      : versions.archived.some((v) => v.label === version)
        ? "text-red-500"
        : versions.active.some((v) => v.label === version)
          ? "text-primary"
          : "";

  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="min-w-[134px] capitalize"
        aria-label={version}
      >
        {version === "canary" ? "canary" : `Version ${version}`}
        <DropdownMenuShortcut className={colorClass}>
          {getIconByLabel(version)}
        </DropdownMenuShortcut>
      </Button>
    </DropdownMenuTrigger>
  );
}
