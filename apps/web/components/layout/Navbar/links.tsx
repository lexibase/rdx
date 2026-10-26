'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { Button } from '@lexibase/rdx-ui/components/button'

import { useVersion } from '@/hooks/use-version'

export function NavbarLinks() {
  const messages = useMessages()
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <>
      <Button key={href} variant="link" size="sm" href={href}>
        {messages.docs}
      </Button>
    </>
  )
}
