import { BrandLogo } from '@lexibase/rdx-ui/components/brand-logo'
import { Button } from '@lexibase/rdx-ui/components/button'

import config from '@/rdx.config'

export function NavbarLogo() {
  return config.navbar.title === '' ? (
    <Button
      variant="ghost"
      size="icon"
      aria-label={config.metadata.applicationName}
      href="/"
      className="cursor-default"
    >
      <BrandLogo source={config.navbar.logo} className="size-5" />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="default"
      aria-label={config.navbar.title}
      href="/"
      className="cursor-default flex items-center gap-2"
    >
      <BrandLogo source={config.navbar.logo} className="size-5" />{' '}
      <span>{config.navbar.title}</span>
    </Button>
  )
}
