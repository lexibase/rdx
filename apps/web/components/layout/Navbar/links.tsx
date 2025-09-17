'use client'

import { Button } from '@rdx/ui/components/button'
import Link from 'next/link'

import { useVersion } from '@/hooks/use-version'
import config from '@/rdx.config'

export function NavbarLinks() {
  const { version } = useVersion()
  const defaultHref = `/docs/${version}`

  const links = config.navbar.items ?? []

  return (
    <>
      {links.length > 0 &&
        links.map((link) => {
          const isDocs = link.label?.toLowerCase() === 'docs'
          const href = isDocs ? defaultHref : (link.href ?? defaultHref)

          return (
            <Button
              key={link.label ?? href}
              variant="link"
              size="sm"
              asChild
              aria-label={link.label}
            >
              <Link href={href}>{link.label}</Link>
            </Button>
          )
        })}
    </>
  )
}
