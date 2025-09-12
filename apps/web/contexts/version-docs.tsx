'use client'

import { createContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getParsedVersions } from '@rdx/rdx-versioning'

import versionsRaw from '../versions.json'

type VersionContextType = {
  currentVersion: string | null
  setCurrentVersion: (v: string) => void
  versionGroups: ReturnType<typeof getParsedVersions>
}

export const VersionContext = createContext<VersionContextType | undefined>(
  undefined
)

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const versionGroups = getParsedVersions(versionsRaw)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem('rdx-version')
    if (saved) {
      const clean = saved === 'canary' ? 'canary' : saved
      setCurrentVersion(clean)
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('rdx-version')
    const versionFromUrl = pathname.match(/^\/docs\/([^/]+)\/?.*$/)?.[1]
    const initial =
      versionFromUrl || saved || versionGroups.active[0]?.label || 'canary'
    setCurrentVersion(initial)
  }, [pathname, versionGroups.active])

  useEffect(() => {
    if (!currentVersion) return
    localStorage.setItem('rdx-version', currentVersion)
  }, [currentVersion])

  return (
    <VersionContext.Provider
      value={{ currentVersion, setCurrentVersion, versionGroups }}
    >
      {children}
    </VersionContext.Provider>
  )
}
