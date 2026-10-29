import { getDocumentation } from '@/lib/docs'

export default async function sitemap() {
  return (await getDocumentation()).sitemap()
}
