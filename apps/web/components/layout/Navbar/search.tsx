'use client'

import { DocsSearch } from '@lexibase/rdx-ui/components/docs-search'
import { usePathname } from 'next/navigation'
import { getParsedVersions } from '@rdx/rdx-versioning'

import versionsRaw from '@/versions.json'

export function NavbarSearch() {
  const pathname = usePathname()
  const versions = getParsedVersions(versionsRaw)
  const current = versions.active[0]?.label ?? 'canary'
  const version =
    (pathname.startsWith('/docs/') ? pathname.split('/')[2] : current) ??
    current
  return (
    <DocsSearch
      key={version}
      indexUrl={`/rdx-search/${encodeURIComponent(version)}`}
      version={version === 'canary' ? 'Canary' : `Version ${version}`}
    />
  )
}
