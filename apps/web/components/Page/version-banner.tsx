import { VersionNotice } from '@lexibase/rdx-ui/components/version-notice'

export function VersionBanner({
  lang,
  version,
  currentVersion,
}: {
  lang?: string
  version: string
  currentVersion?: string
}) {
  const isCanary = version === 'canary'
  const isOutdated = version !== currentVersion && !isCanary

  if (!currentVersion || (!isOutdated && !isCanary)) return null

  return (
    <VersionNotice
      lang={lang}
      kind={isCanary ? 'canary' : 'outdated'}
      currentHref={`/docs/${currentVersion}`}
    />
  )
}
