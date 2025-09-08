'use client'

import { Button } from '@mdxrenderdocs/ui/components/button'
import { Archive, Bird, PackageOpen, Spline } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@mdxrenderdocs/ui/components/dropdown-menu'
import { useEffect, useState, type JSX } from 'react'
import { useRouter } from 'next/navigation'

import staticVersions from '../../versions.json'

import { useVersion } from '@/hooks/use-version'

const iconMap = {
  bird: Bird,
  packageOpen: PackageOpen,
  archive: Archive,
}

type VersionMeta = {
  label: string
  icon: keyof typeof iconMap
}

export function DropdownVersion() {
  const { version, setVersion } = useVersion()
  const router = useRouter()

  const [versions, setVersions] = useState<{
    canary: VersionMeta
    active: VersionMeta[]
    archived: VersionMeta[]
  } | null>(null)

  useEffect(() => {
    const inferIcon = (label: string): keyof typeof iconMap => {
      const version = label.replace('version-', '')
      return version <= '1.0.0' ? 'archive' : 'packageOpen'
    }

    const parsedVersions = (staticVersions as string[]).map(
      (label): VersionMeta => ({
        label,
        icon: inferIcon(label),
      })
    )

    const current: VersionMeta = parsedVersions[0] ?? {
      label: 'unknown',
      icon: 'archive',
    }
    const rest = parsedVersions.slice(1)

    const active = rest.filter((v) => v.icon === 'packageOpen')
    const archived = rest.filter((v) => v.icon === 'archive')

    setVersions({
      canary: { label: 'canary', icon: 'bird' },
      active: [current, ...active],
      archived,
    })
  }, [])

  function handleSelectVersion(label: string) {
    const targetVersion =
      label === 'canary' ? 'canary' : label.replace('version-', '')
    const pathname = window.location.pathname
    const match = pathname.match(/^\/docs\/([^\/]+)\/([^\/]+)$/)
    const currentFilename = match?.[2] || 'intro'

    // setVersion(targetVersion)
    router.push(`/docs/${targetVersion}/${currentFilename}`)
  }

  const getIconByLabel = (label: string): JSX.Element | null => {
    if (!versions || !label) return null

    const normalizedLabel = label.toLowerCase().replace('version-', '')

    const all = [versions.canary, ...versions.active, ...versions.archived]

    const found = all.find((v) => {
      const vNormalized = v.label.toLowerCase().replace('version-', '')
      return vNormalized === normalizedLabel
    })

    const Icon = found?.icon ? iconMap[found.icon] : null
    return Icon ? <Icon className="size-4" /> : null
  }

  if (!versions) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-[134px] px-9 overflow-hidden"
      >
        <div className="animate-spin flex item-center justify-center">
          <Spline className="size-4" />
        </div>
      </Button>
    )
  }

  const isCurrentVersion = (label: string) =>
    label.replace('version-', '') === version

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[134px] capitalize"
        >
          {version === 'canary'
            ? 'canary'
            : `Version ${version?.replace('version-', '')}`}
          <DropdownMenuShortcut
            className={
              version === 'canary'
                ? 'text-blue-500'
                : versions?.archived.some(
                      (v) => v.label.replace('version-', '') === version
                    )
                  ? 'text-red-500'
                  : versions?.active.some(
                        (v) => v.label.replace('version-', '') === version
                      )
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
          <DropdownMenuItem
            onClick={() => handleSelectVersion(versions.canary.label)}
            className={`capitalize ${isCurrentVersion(versions.canary.label) ? 'bg-accent/30 border-1 border-border' : ''}`}
            aria-label="Version Canary"
          >
            {versions.canary.label}
            <DropdownMenuShortcut>
              {getIconByLabel(versions.canary.label)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {versions.active.map(({ label }) => (
            <DropdownMenuItem
              key={label}
              className={`capitalize ${isCurrentVersion(label) ? 'bg-accent/30 border-1 border-border' : ''}`}
              onClick={() => handleSelectVersion(label)}
            >
              {label.replace('version-', 'version ')}
              <DropdownMenuShortcut>
                {getIconByLabel(label)}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-center py-px">
            Archived
          </DropdownMenuLabel>
          {versions.archived.map(({ label }) => (
            <DropdownMenuItem
              key={label}
              className={`text-primary/60 capitalize ${isCurrentVersion(label) ? 'bg-red-800/5 border-1 border-red-600/20' : ''}`}
              onClick={() => handleSelectVersion(label)}
            >
              {label.replace('version-', 'version ')}
              <DropdownMenuShortcut>
                {getIconByLabel(label)}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
