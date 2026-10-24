'use client'

import { VersionDropdown } from '@lexibase/rdx-ui/components/version-dropdown'

import { useVersion } from '@/hooks/use-version'
import { useVersionNavigation } from '@/hooks/use-version-navigation'

export function DropdownVersion() {
  const { version, editions } = useVersion()
  const navigateToVersion = useVersionNavigation()
  return (
    <VersionDropdown
      options={editions}
      currentId={version}
      onSelect={navigateToVersion}
    />
  )
}
