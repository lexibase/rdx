import { useEffect, useSyncExternalStore } from 'react'

import type { SidebarCategory } from '../components/docs-sidebar'
import type { VersionOption } from '../components/version-dropdown'

/**
 * Menus rendered on wide screens describe themselves here, so the mobile
 * drawer can present the same data without new Navbar props or duplicated
 * routing logic. Registration happens in effects: the server never writes.
 */
export type MobileNavigationEntries = {
  docs?: { categories: SidebarCategory[]; pathname: string }
  versions?: {
    options: VersionOption[]
    currentId: string
    onSelect?: (id: string) => void
  }
  languages?: {
    options: { code: string; label: string; href: string }[]
    current: string
    contributionUrl?: string
  }
}

const empty: MobileNavigationEntries = {}
let entries: MobileNavigationEntries = empty
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function update(next: MobileNavigationEntries) {
  entries = next
  for (const listener of listeners) listener()
}

export function useMobileNavigationEntries() {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => empty
  )
}

/** Publish a menu while its wide-screen component is mounted. */
export function useRegisterMobileNavigation<
  Key extends keyof MobileNavigationEntries,
>(key: Key, value: MobileNavigationEntries[Key]) {
  useEffect(() => {
    update({ ...entries, [key]: value })
    return () => {
      // A newer registration (e.g. the next page) must not be cleared.
      if (entries[key] === value) update({ ...entries, [key]: undefined })
    }
  }, [key, value])
}
