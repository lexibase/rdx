'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import { usePathname } from 'next/navigation'
import { getParsedVersions } from '@rdx/rdx-versioning'

import versionsRaw from '../versions.json'

type VersionContextType = {
  version: string
  setVersion: (v: string) => void
}

export const VersionContext = createContext<VersionContextType | undefined>(
  undefined
)

const versionChanged = 'rdx-version-change'

function subscribeToVersion(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(versionChanged, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(versionChanged, onChange)
  }
}

function readStoredVersion() {
  try {
    return localStorage.getItem('rdx-version')
  } catch {
    return null
  }
}

function readServerVersion() {
  return null
}

function storeVersion(version: string) {
  try {
    localStorage.setItem('rdx-version', version)
    window.dispatchEvent(new Event(versionChanged))
  } catch {
    // Documentation navigation still works when browser storage is unavailable.
  }
}

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const parsedVersions = useMemo(() => getParsedVersions(versionsRaw), [])
  const defaultVersion = parsedVersions.active[0]?.label || 'canary'
  const savedVersion = useSyncExternalStore(
    subscribeToVersion,
    readStoredVersion,
    readServerVersion
  )
  const pathname = usePathname()

  const versionFromUrl = useMemo(() => {
    const match = pathname.match(/^\/docs\/([^/]+)\/?.*$/)
    return match?.[1]
  }, [pathname])

  const version = versionFromUrl || savedVersion || defaultVersion
  const setVersion = useCallback((value: string) => storeVersion(value), [])
  useEffect(() => {
    if (versionFromUrl) storeVersion(versionFromUrl)
  }, [versionFromUrl])

  return (
    <VersionContext.Provider value={{ version, setVersion }}>
      {children}
    </VersionContext.Provider>
  )
}
