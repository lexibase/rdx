'use client'

import { useMessages } from '@lexibase/rdx-ui/providers/locale-provider'
import { Badge } from '@lexibase/rdx-ui/components/badge'
import { NavbarLink } from '@lexibase/rdx-ui/components/navbar-link'

import { useVersion } from '@/hooks/use-version'

export function NavbarLinks() {
  const messages = useMessages()
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <NavbarLink key={href} href={href} section="/docs">
      {messages.docs}
    </NavbarLink>
  )
}

export function NavbarTemplatesLink() {
  return (
    <NavbarLink href="/templates">
      <span className="relative">
        Templates
        <Badge
          variant="secondary"
          className="pointer-events-none absolute -end-5 -top-1.5 h-2.5 border-0 px-1 py-0 text-[9px] leading-none"
        >
          Beta
        </Badge>
      </span>
    </NavbarLink>
  )
}
