import { getHomepageMetadata, HomePage } from '@lexibase/rdx-next/runtime'

import { getHomepageSeo, getHomepageTranslation } from '../rdx-home'
import { getProject } from '../rdx-project'

export async function generateMetadata() {
  return getHomepageMetadata({
    project: await getProject(),
    ...getHomepageSeo(),
  })
}

export default async function Home() {
  return <HomePage project={await getProject()} {...getHomepageTranslation()} />
}
