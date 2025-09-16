import { useRouter } from 'next/navigation'

import { useVersion } from './use-version'

export function useVersionNavigation() {
  const router = useRouter()
  const { setVersion } = useVersion()

  return {
    navigateToVersion(label: string) {
      const targetVersion = label === 'canary' ? 'canary' : label
      const pathname = window.location.pathname
      const match = pathname.match(/^\/docs\/([^/]+)\/([^/]+)$/)
      const currentFileName = match?.[2] || 'intro'

      setVersion(targetVersion)
      router.push(`/docs/${targetVersion}/${currentFileName}`)
    },
  }
}
