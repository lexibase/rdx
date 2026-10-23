'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import { usePathname } from 'next/navigation'
import type { VersionOption } from '@lexibase/rdx-ui/components/version-dropdown'

type VersionContextType = {
  version: string
  setVersion: (v: string) => void
  editions: VersionOption[]
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

export function VersionProvider({
  children,
  editions,
}: {
  children: React.ReactNode
  editions: VersionOption[]
}) {
  const defaultVersion =
    editions.find((edition) => edition.kind === 'version')?.id || 'canary'
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

  const version =
    versionFromUrl ||
    (editions.some((edition) => edition.id === savedVersion)
      ? savedVersion
      : null) ||
    defaultVersion
  const setVersion = useCallback((value: string) => storeVersion(value), [])
  useEffect(() => {
    if (versionFromUrl) storeVersion(versionFromUrl)
  }, [versionFromUrl])

  return (
    <VersionContext.Provider value={{ version, setVersion, editions }}>
      {children}
    </VersionContext.Provider>
  )
}
