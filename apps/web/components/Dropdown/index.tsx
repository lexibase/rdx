'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, Github, Spline } from 'lucide-react'
import { Button } from '@rdx/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@rdx/ui/components/dropdown-menu'
import Link from 'next/link'
import { getParsedVersions } from '@rdx/rdx-versioning'
import { LoadingButton } from '@rdx/ui/components/loading-button'

import { useVersion } from '@/hooks/use-version'
import { createGetIconByLabel } from '@/lib/get-icon-by-label'
import { useVersionNavigation } from '@/hooks/use-version-navigation'

import versionsRaw from '../../versions.json'

import { VersionItem } from './version-item'
import { DropdownTrigger } from './trigger'
import { VersionGroup } from './group'

export function DropdownVersion() {
  const { version } = useVersion()
  const { navigateToVersion } = useVersionNavigation()

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
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-center py-px cursor-default">
            Archived
          </DropdownMenuLabel>
          <VersionGroup
            versions={versions.archived}
            isCurrentVersion={isCurrentVersion}
            getIconByLabel={getIconByLabel}
            onSelect={navigateToVersion}
          />

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="bg-red-900/20 text-primary/60 border-1 border-red-800/40 capitalize hover:!bg-red-900/30"
            asChild
          >
            <Link
              href="https://github.com/duhnunes/mdxRenderDocs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Version 1.1.1
              <DropdownMenuShortcut>
                <div className="flex items-center gap-2">
                  <Github className="size-4" />
                  <ExternalLink className="size-4" />
                </div>
              </DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
