import { VersionNotice } from '@lexibase/rdx-ui/components/version-notice'

export function VersionBanner({
  version,
  currentVersion,
}: {
  version: string
  currentVersion?: string
}) {
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
