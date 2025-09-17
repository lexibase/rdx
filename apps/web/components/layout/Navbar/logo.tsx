import { Button } from '@rdx/ui/components/button'
import Link from 'next/link'

import config from '@/rdx.config'

export function NavbarLogo() {
  const LogoComponent = config.navbar.logo

  return config.navbar.title === '' ? (
    <Button variant="ghost" size="icon" asChild>
      <Link href="/" className="cursor-default">
        <LogoComponent className="size-5" />
      </Link>
    </Button>
  ) : (
    <Button variant="ghost" size="default" asChild>
      <Link href="/" className="cursor-default flex items-center gap-2">
        <LogoComponent className="size-5" /> <span>{config.navbar.title}</span>
      </Link>
    </Button>
  )
}
