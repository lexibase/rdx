'use client'

import { DocsSearch } from '@lexibase/rdx-ui/components/docs-search'
import { usePathname } from 'next/navigation'

import { useVersion } from '@/hooks/use-version'

export function NavbarSearch() {
  const pathname = usePathname()
  const { editions } = useVersion()
  const current =
    editions.find((edition) => edition.kind === 'version')?.id ?? 'canary'
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
