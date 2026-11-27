'use client'

import { NotFound as SharedNotFound } from '@lexibase/rdx-ui/components/not-found'
import { useLanguage } from '@lexibase/rdx-ui/providers/locale-provider'

import { useVersion } from '@/hooks/use-version'

export default function NotFound() {
  const lang = useLanguage()
  const { version } = useVersion()
  const href = `/docs/${version}`

  return <SharedNotFound href={href} lang={lang} />
}
