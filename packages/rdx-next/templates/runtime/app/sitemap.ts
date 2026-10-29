import { getRdxSitemap } from '@lexibase/rdx-next/runtime'
import { getProject } from '../rdx-project'

export default async function sitemap() {
  return getRdxSitemap(await getProject())
}
