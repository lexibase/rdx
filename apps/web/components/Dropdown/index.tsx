'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Github, Spline } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@rdx/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@rdx/ui/components/dropdown-menu'
import Link from 'next/link'
import { getParsedVersions } from '@rdx/rdx-versioning'

import { useVersion } from '@/hooks/use-version'
import { createGetIconByLabel } from '@/lib/get-icon-by-label'

import versionsRaw from '../../versions.json'

import { VersionItem } from './version-item'

export function DropdownVersion() {
  const { version, setVersion } = useVersion()
  const router = useRouter()

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

  function handleSelectVersion(label: string) {
    const targetVersion = label === 'canary' ? 'canary' : label
    const pathname = window.location.pathname
    const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/)
    const currentFilename = match?.[2] || 'intro'

    setVersion(targetVersion)
    router.push(`/docs/${targetVersion}/${currentFilename}`)
  }

  const isCurrentVersion = (label: string) => label === version

  if (!versions) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-[134px] px-9 overflow-hidden"
        disabled
      >
        <div className="animate-spin flex items-center justify-center">
          <Spline className="size-4" />
        </div>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[134px] capitalize"
        >
          {version === 'canary' ? 'canary' : `Version ${version}`}
          <DropdownMenuShortcut
            className={
              version === 'canary'
                ? 'text-blue-500'
                : versions.archived.some((v) => v.label === version)
                  ? 'text-red-500'
                  : versions.active.some((v) => v.label === version)
                    ? 'text-primary'
                    : ''
            }
          >
            {getIconByLabel(version)}
          </DropdownMenuShortcut>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <VersionItem
            label={versions.canary.label}
            isActive={isCurrentVersion(versions.canary.label)}
            onSelect={handleSelectVersion}
            icon={getIconByLabel(versions.canary.label)}
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {versions.active.map(({ label }) => (
            <VersionItem
              key={label}
              label={label}
              isActive={isCurrentVersion(label)}
              onSelect={handleSelectVersion}
              icon={getIconByLabel(label)}
            />
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-center py-px cursor-default">
            Archived
          </DropdownMenuLabel>
          {versions.archived.map(({ label }) => (
            <VersionItem
              key={label}
              label={label}
              isActive={isCurrentVersion(label)}
              onSelect={handleSelectVersion}
              icon={getIconByLabel(label)}
              className="text-primary/60"
            />
          ))}

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
