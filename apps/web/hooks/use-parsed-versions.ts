import { getParsedVersions } from '@rdx/rdx-versioning'
import { useEffect, useState } from 'react'

import versionsRaw from '../versions.json'

export function useVersionGroup() {
  const [parsedVersions, setParsedVersions] = useState<ReturnType<
    typeof getParsedVersions
  > | null>(null)

  useEffect(() => {
    setParsedVersions(getParsedVersions(versionsRaw))
  }, [])

  return parsedVersions
}
