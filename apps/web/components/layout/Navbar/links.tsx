'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { Badge } from '@lexibase/rdx-ui/components/badge'
import { Button } from '@lexibase/rdx-ui/components/button'
import { usePathname } from 'next/navigation'

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

export function NavbarTemplatesLink() {
  const pathname = usePathname()

  return (
    <Button
      variant="link"
      size="sm"
      href="/templates"
      aria-current={pathname === '/templates' ? 'page' : undefined}
    >
      <span className="relative">
        Templates
        <Badge
          variant="secondary"
          className="pointer-events-none absolute -end-5 -top-1.5 h-2.5 border-0 px-1 py-0 text-[9px] leading-none"
        >
          Beta
        </Badge>
      </span>
    </Button>
  )
}
