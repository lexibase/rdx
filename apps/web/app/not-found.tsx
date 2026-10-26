'use client'

import { NotFound as SharedNotFound } from '@lexibase/rdx-ui/components/not-found'
import { useInterfaceLocale } from '@lexibase/rdx-ui/providers/locale-provider'

import { useVersion } from '@/hooks/use-version'

export default function NotFound() {
  const lang = useInterfaceLocale()
  const { version } = useVersion()
  const href = `/docs/${version}`

  return <SharedNotFound href={href} lang={lang} />
}
