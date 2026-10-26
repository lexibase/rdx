import { Button } from '@lexibase/rdx-ui/components/button'

import config from '@/rdx.config'

export function NavbarLogo() {
  const LogoComponent = config.navbar.logo

  return config.navbar.title === '' ? (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Logo"
      href="/"
      className="cursor-default"
    >
      <LogoComponent className="size-5" />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="default"
      aria-label={`Logo from ${config.navbar.title}`}
      href="/"
      className="cursor-default flex items-center gap-2"
    >
      <LogoComponent className="size-5" /> <span>{config.navbar.title}</span>
    </Button>
  )
}
