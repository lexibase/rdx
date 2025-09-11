'use client'

import { useEffect, useState, type JSX } from 'react'
import {
  Archive,
  Bird,
  ExternalLink,
  Github,
  PackageOpen,
  Spline,
} from 'lucide-react'
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

import { useVersion } from '@/hooks/use-version'
import { getParsedVersions } from '@/lib/versioning'

const iconMap = {
  bird: Bird,
  packageOpen: PackageOpen,
  archive: Archive,
}

export function DropdownVersion() {
  const { version, setVersion } = useVersion()
  const router = useRouter()

  const [versions, setVersions] = useState<ReturnType<
    typeof getParsedVersions
  > | null>(null)

  useEffect(() => {
    setVersions(getParsedVersions)
  }, [])

  function handleSelectVersion(label: string) {
    const targetVersion = label === 'canary' ? 'canary' : label
    const pathname = window.location.pathname
    const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/)
    const currentFilename = match?.[2] || 'intro'

    setVersion(targetVersion)
    router.push(`/docs/${targetVersion}/${currentFilename}`)
  }

  const getIconByLabel = (label: string): JSX.Element | null => {
    if (!versions || !label) return null

    const all = [versions.canary, ...versions.active, ...versions.archived]
    const found = all.find((v) => v.label === label)

    const Icon = found?.icon ? iconMap[found.icon] : null
    return Icon ? <Icon className="size-4" /> : null
  }

  const isCurrentVersion = (label: string) => label === version

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
                : versions?.archived.some((v) => v.label === version)
                  ? 'text-red-500'
                  : versions?.active.some((v) => v.label === version)
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
              Version {label}
              <DropdownMenuShortcut>
                {getIconByLabel(label)}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-center py-px cursor-default">
            Archived
          </DropdownMenuLabel>
          {versions.archived.map(({ label }) => (
            <DropdownMenuItem
              key={label}
              className={`text-primary/60 capitalize ${isCurrentVersion(label) ? 'bg-red-800/5 border-1 border-red-600/20' : ''}`}
              onClick={() => handleSelectVersion(label)}
            >
              {label}
              <DropdownMenuShortcut>
                {getIconByLabel(label)}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
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
