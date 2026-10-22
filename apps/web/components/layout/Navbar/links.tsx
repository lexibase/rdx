'use client'

import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'

import { useVersion } from '@/hooks/use-version'

export function NavbarLinks() {
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <>
      <ButtonLink key={href} variant="link" size="sm" href={href}>
        Docs
      </ButtonLink>
    </>
  )
}
