'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@rdx/ui/components/dropdown-menu'
import { getParsedVersions } from '@rdx/rdx-versioning'
import { LoadingButton } from '@rdx/ui/components/loading-button'

import { useVersion } from '@/hooks/use-version'
import { createGetIconByLabel } from '@/lib/get-icon-by-label'
import { useVersionNavigation } from '@/hooks/use-version-navigation'

import versionsRaw from '../../versions.json'

import { VersionItem } from './version-item'
import { DropdownTrigger } from './trigger'
import { VersionGroup } from './group'
import { ExternalLink } from './external-link'

export function DropdownVersion() {
  const { version } = useVersion()
  const navigateToVersion = useVersionNavigation()

  const [versions, setVersions] = useState<ReturnType<
    typeof getParsedVersions
  > | null>(null)

  const getIconByLabel = useMemo(
    () => createGetIconByLabel(versions),
    [versions]
  )

  useEffect(() => {
    setVersions(getParsedVersions(versionsRaw))
  }, [])

  const isCurrentVersion = useCallback(
    (label: string) => label === version,
    [version]
  )

  if (!versions) {
    return <LoadingButton />
  }

  return (
    <DropdownMenu>
      <DropdownTrigger
        version={version}
        versions={versions}
        getIconByLabel={getIconByLabel}
      />

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <VersionItem
            label={versions.canary.label}
            isActive={isCurrentVersion(versions.canary.label)}
            onSelect={navigateToVersion}
            icon={getIconByLabel(versions.canary.label)}
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <VersionGroup
          versions={versions.active}
          isCurrentVersion={isCurrentVersion}
          getIconByLabel={getIconByLabel}
          onSelect={navigateToVersion}
        />
        {versions.archived.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-center py-px cursor-default">
                Archived
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <VersionGroup
                versions={versions.archived}
                isCurrentVersion={isCurrentVersion}
                getIconByLabel={getIconByLabel}
                onSelect={navigateToVersion}
              />
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <ExternalLink />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
