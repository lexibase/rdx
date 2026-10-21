import { Navbar as SharedNavbar } from '@lexibase/rdx-ui/components/navbar'

import { DropdownVersion } from '@/components/Dropdown'
import config from '@/rdx.config'

import { NavbarLinks } from './links'

export function Navbar() {
  const BrandLogo = config.navbar.logo
  return (
    <SharedNavbar
      title={config.navbar.title ?? ''}
      siteTitle={config.title}
      logo={<BrandLogo className="size-5" />}
      versionMenu={<DropdownVersion />}
      docsLink={<NavbarLinks />}
      github={config.navbar.actions?.github}
      showToggleMode={config.navbar.actions?.showToggleMode}
    />
  )
}
