import { BrandLogo } from '@lexibase/rdx-ui/components/brand-logo'
import { Navbar as SharedNavbar } from '@lexibase/rdx-ui/components/navbar'

import { DropdownVersion } from '@/components/Dropdown'
import config from '@/rdx.config'

import { NavbarLinks, NavbarTemplatesLink } from './links'
import { NavbarSearch } from './search'

export function Navbar() {
  return (
    <SharedNavbar
      lang={config.lang}
      title={config.navbar.title ?? ''}
      search={config.search ? <NavbarSearch /> : undefined}
      siteTitle={config.metadata.applicationName}
      logo={<BrandLogo source={config.navbar.logo} className="size-5" />}
      leadingLinks={<NavbarTemplatesLink />}
      versionMenu={<DropdownVersion />}
      docsLink={<NavbarLinks />}
      github={config.navbar.actions?.github}
      showToggleMode={config.navbar.actions?.showToggleMode}
    />
  )
}
