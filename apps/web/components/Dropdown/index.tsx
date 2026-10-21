'use client'

import {
  VersionDropdown,
  type VersionOption,
} from '@lexibase/rdx-ui/components/version-dropdown'
import { getParsedVersions } from '@rdx/rdx-versioning'

import { useVersion } from '@/hooks/use-version'
import { useVersionNavigation } from '@/hooks/use-version-navigation'

import versionsRaw from '../../versions.json'

import { ExternalLink } from './external-link'

export function DropdownVersion() {
  const { version } = useVersion()
  const navigateToVersion = useVersionNavigation()
  const versions = getParsedVersions(versionsRaw)
  const options: VersionOption[] = [
    {
      id: versions.canary.label,
      label: 'Canary',
      href: '/docs/canary',
      kind: 'live',
    },
    ...versions.active.map(({ label }) => ({
      id: label,
      label: `Version ${label}`,
      href: `/docs/${label}`,
      kind: 'version' as const,
    })),
    ...versions.archived.map(({ label }) => ({
      id: label,
      label: `Version ${label}`,
      href: `/docs/${label}`,
      kind: 'archived' as const,
    })),
  ]
  return (
    <VersionDropdown
      options={options}
      currentId={version}
      onSelect={navigateToVersion}
      footer={<ExternalLink />}
    />
  )
}
