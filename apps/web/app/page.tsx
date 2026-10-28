import { Home } from '@lexibase/rdx-ui/components/home'
import type { RdxHomepage } from '@lexibase/rdx-types'
import { redirect } from 'next/navigation'

import config from '@/rdx.config'

export default function HomePage() {
  const homepage: RdxHomepage = config.homepage
  if (!homepage.enabled) redirect('/docs')
  const CustomHome = homepage.component
  return (
    <main
      id="rdx-main"
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col outline-none"
    >
      {CustomHome ? (
        <CustomHome />
      ) : (
        <Home
          title={homepage.title ?? config.metadata.applicationName}
          description={homepage.description}
          buttons={homepage.buttons}
        />
      )}
    </main>
  )
}
