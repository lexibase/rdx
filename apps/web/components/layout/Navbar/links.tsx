'use client'

import { Button } from '@lexibase/rdx-ui/components/button'

import { useVersion } from '@/hooks/use-version'

export function NavbarLinks() {
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <>
      <Button key={href} variant="link" size="sm" href={href}>
        Docs
      </Button>
    </>
  )
}
