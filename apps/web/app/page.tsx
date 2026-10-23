import { Home } from '@lexibase/rdx-ui/components/home'
import type { RdxHomepage } from '@lexibase/rdx-types'
import { redirect } from 'next/navigation'

import config from '@/rdx.config'

export default function HomePage() {
  const homepage: RdxHomepage = config.homepage
  if (!homepage.enabled) redirect('/docs')
  const CustomHome = homepage.component
  return CustomHome ? (
    <CustomHome />
  ) : (
    <Home
      title={homepage.title ?? config.title}
      description={homepage.description}
      buttons={homepage.buttons}
    />
  )
}
