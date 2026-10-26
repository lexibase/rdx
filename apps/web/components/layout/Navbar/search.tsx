'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import { DocsSearch } from '@lexibase/rdx-ui/components/docs-search'
import { usePathname } from 'next/navigation'

import { useVersion } from '@/hooks/use-version'

export function NavbarSearch() {
  const messages = useMessages()
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
      version={
        version === 'canary'
          ? 'Canary'
          : formatMessage(messages.version, { version })
      }
    />
  )
}
