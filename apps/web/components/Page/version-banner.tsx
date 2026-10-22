import type { VersionsRaw } from '@rdx/types/loaders'
import { VersionNotice } from '@lexibase/rdx-ui/components/version-notice'

export function VersionBanner({
  version,
  versionsRaw,
}: {
  version: string
  versionsRaw: VersionsRaw
}) {
  const currentVersion = versionsRaw.active[0]
  const isCanary = version === 'canary'
  const isOutdated = version !== currentVersion && !isCanary

  if (!currentVersion || (!isOutdated && !isCanary)) return null

  return (
    <VersionNotice
      kind={isCanary ? 'canary' : 'outdated'}
      currentHref={`/docs/${currentVersion}`}
    />
  )
}
