'use client'

import { useCallback, type JSX } from 'react'
import {
  Archive,
  Bird,
  ExternalLink,
  Github,
  PackageOpen,
  Spline,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@rdx/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@rdx/ui/components/dropdown-menu'
import Link from 'next/link'

import { useVersion } from '@/hooks/use-version'

import { GroupDropdown } from './group'

const iconMap = {
  bird: Bird,
  packageOpen: PackageOpen,
  archive: Archive,
}

export function DropdownVersion() {
  const { currentVersion, setCurrentVersion, versionGroups } = useVersion()
  const router = useRouter()
  const pathname = usePathname()

  function handleSelectVersion(label: string) {
    const targetVersion = label === 'canary' ? 'canary' : label
    const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/)
    const currentFilename = match?.[2] || 'intro'

    setCurrentVersion(targetVersion)
    router.push(`/docs/${targetVersion}/${currentFilename}`)
  }

  const getIconByLabel = useCallback(
    (label: string): JSX.Element | null => {
      const all = [
        versionGroups.canary,
        ...versionGroups.active,
        ...versionGroups.archived,
      ]
      const found = all.find((v) => v.label === label)
      const Icon = found?.icon ? iconMap[found.icon] : null
      return Icon ? <Icon className="size-4" /> : null
    },
    [versionGroups]
  )

  const isCurrentVersion = (label: string) => label === currentVersion

  if (!currentVersion) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-[134px] px-9 overflow-hidden"
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
          {currentVersion === 'canary' ? 'canary' : `Version ${currentVersion}`}
          <DropdownMenuShortcut
            className={
              currentVersion === 'canary'
                ? 'text-blue-500'
                : versionGroups.archived.some((v) => v.label === currentVersion)
                  ? 'text-red-500'
                  : versionGroups.active.some((v) => v.label === currentVersion)
                    ? 'text-primary'
                    : ''
            }
          >
            {getIconByLabel(currentVersion)}
          </DropdownMenuShortcut>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => handleSelectVersion(versionGroups.canary.label)}
            className={`capitalize ${isCurrentVersion(versionGroups.canary.label) ? 'bg-accent/30 border-1 border-border' : ''}`}
            aria-label="Version Canary"
          >
            {versionGroups.canary.label}
            <DropdownMenuShortcut>
              {getIconByLabel(versionGroups.canary.label)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <GroupDropdown
          versions={versionGroups.active}
          currentVersion={currentVersion}
          getIconByLabel={getIconByLabel}
          onSelect={handleSelectVersion}
          style="active"
        />

        <DropdownMenuGroup>
          <GroupDropdown
            title="Archived"
            versions={versionGroups.archived}
            currentVersion={currentVersion}
            getIconByLabel={getIconByLabel}
            onSelect={handleSelectVersion}
            style="archived"
          />

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
