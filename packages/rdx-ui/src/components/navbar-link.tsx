'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Button } from './button'

export function NavbarLink({
  href,
  section = href,
  children,
}: {
  href: string
  section?: string
  children: ReactNode
}) {
  const pathname = usePathname()?.replace(/\/$/, '')
  const active = pathname === section || pathname?.startsWith(`${section}/`)

  return (
    <Button
      variant="link"
      size="sm"
      href={href}
      aria-current={active ? (pathname === href ? 'page' : 'true') : undefined}
      className="[&[aria-current]]:underline"
    >
      {children}
    </Button>
  )
}
