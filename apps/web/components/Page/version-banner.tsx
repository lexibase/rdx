import type { VersionsRaw } from '@rdx/types/loaders'
import Link from 'next/link'

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

  if (!isOutdated && !isCanary) return null

  const variant = isOutdated ? 'red' : 'amber'
  const message = isOutdated
    ? 'This is an outdated version of the documentation.'
    : 'This is a pre-release version of the documentation.'

  const styles = {
    red: {
      bg: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-700',
    },
    amber: {
      bg: 'bg-amber-100',
      border: 'border-amber-500',
      text: 'text-amber-700',
    },
  }
  const style = styles[variant]

  return (
    <div
      className={`${style.bg} border ${style.border} ${style.text} px-4 py-2 -mt-4 mb-4 rounded-sm text-sm flex items-center gap-2`}
    >
      {message}
      <Link href={`/docs/${currentVersion}`} className="underline font-medium">
        Go back to the current version
      </Link>
    </div>
  )
}
