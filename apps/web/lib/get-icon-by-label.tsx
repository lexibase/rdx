import type { getParsedVersions } from '@rdx/rdx-versioning'
import { type JSX } from 'react'
import { Archive, Bird, PackageOpen } from 'lucide-react'

export const iconMap = {
  bird: Bird,
  packageOpen: PackageOpen,
  archive: Archive,
}

const createGetIconByLabel = (
  versions: ReturnType<typeof getParsedVersions> | null
) => {
  const getIconByLabel = (label: string): JSX.Element | null => {
    if (!versions || !label) return null

    const all = [versions.canary, ...versions.active, ...versions.archived]
    const found = all.find((v) => v.label === label)

    const Icon = found?.icon ? iconMap[found.icon] : null
    return Icon ? <Icon className="size-4" /> : null
  }

  return getIconByLabel
}

export { createGetIconByLabel }
