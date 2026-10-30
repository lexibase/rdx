import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const defaultFiles = [
  'layout.tsx',
  'page.tsx',
  'not-found.tsx',
  'docs/[[...slug]]/page.tsx',
]
const generated = [
  ...defaultFiles.map((file) => `app/(rdx-default)/${file}`),
  'app/(rdx-default)/[...notFound]/page.tsx',
  'app/(rdx-locales)/[locale]/layout.tsx',
  'app/(rdx-locales)/[locale]/not-found.tsx',
  'app/(rdx-locales)/[locale]/docs/[[...slug]]/page.tsx',
  'app/(rdx-locales)/[locale]/rdx-search/[source]/route.ts',
]

/** Root layouts keep HTML language correct on the server, without middleware. */
export async function prepareLocaleRoutes(project, runtime, template) {
  async function safe(file) {
    const parts = file.split('/')
    let current = runtime
    for (const segment of parts) {
      current = path.join(current, segment)
      try {
        if ((await lstat(current)).isSymbolicLink())
          throw new Error(
            `Generated locale routes must not contain links: ${current}`
          )
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    return current
  }
  const marker = await safe('.rdx-localization.json')
  let owned = false
  try {
    owned = JSON.parse(await readFile(marker, 'utf8')).version === 1
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (!project.localization) {
    if (owned) {
      for (const file of generated) await rm(await safe(file), { force: true })
      await rm(marker)
    }
    return
  }
  async function emit(file, content) {
    const target = await safe(file)
    if (!owned) {
      try {
        await lstat(target)
        throw new Error(
          `Conflicting generated locale route: ${target}. Remove the old .rdx/ runtime and prepare again.`
        )
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  const layout = await readFile(path.join(template, 'app/layout.tsx'), 'utf8')
  const provider = layout.match(/from '([^']+\/runtime)'/)[1]
  for (const file of defaultFiles) {
    const text = await readFile(path.join(template, 'app', file), 'utf8')
    await emit(
      `app/(rdx-default)/${file}`,
      text
        .replace(/from '(\.\.\/[^']*rdx-project)'/g, "from '../$1'")
        .replace("'./globals.css'", "'../globals.css'")
    )
  }
  await emit(
    'app/(rdx-default)/[...notFound]/page.tsx',
    `import { notFound } from 'next/navigation'\nexport default function Missing() { notFound() }\n`
  )
  await emit(
    'app/(rdx-locales)/[locale]/layout.tsx',
    `import { RdxLayout, getRdxMetadata, getLocalizedProject } from '${provider}'
import { getProject } from '../../../rdx-project'
import '../../globals.css'
export async function generateStaticParams() { return (await getProject()).localization!.locales.map(locale => ({ locale: locale.path })) }
export const dynamicParams = false
async function configuration(params: Promise<{ locale: string }>) {
  const project = await getProject()
  const { locale } = await params
  return project.localization!.locales.some(entry => entry.path === locale) ? getLocalizedProject(project, locale).config : project.config
}
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { return getRdxMetadata(await configuration(params)) }
export default async function Layout({ children, params }: { children: React.ReactNode, params: Promise<{ locale: string }> }) {
  return <RdxLayout config={await configuration(params)} bodyClassName="antialiased">{children}</RdxLayout>
}
`
  )
  await emit(
    'app/(rdx-locales)/[locale]/not-found.tsx',
    `import { NotFoundPage } from '${provider}'
import { getProject } from '../../../rdx-project'
export default async function Missing() { return <NotFoundPage project={await getProject()} /> }
`
  )
  await emit(
    'app/(rdx-locales)/[locale]/docs/[[...slug]]/page.tsx',
    `import { DocsPage, getDocumentMetadata, getProjectDocsPaths, getLocalizedProject } from '${provider}'
import { notFound } from 'next/navigation'
import { getProject } from '../../../../../rdx-project'
type Params = { locale: string, slug?: string[] }
async function selected(locale: string) {
  const project = await getProject()
  if (!project.localization!.locales.some(entry => entry.path === locale)) notFound()
  return getLocalizedProject(project, locale)
}
export async function generateStaticParams({ params }: { params: { locale: string } }) { return getProjectDocsPaths(await selected(params.locale)).map(slug => ({ slug: slug.split('/') })) }
export async function generateMetadata({ params }: { params: Promise<Params> }) { const { locale, slug } = await params; return getDocumentMetadata({ project: await selected(locale), slug }) }
export default async function Page({ params }: { params: Promise<Params> }) { const { locale, slug } = await params; return <DocsPage project={await selected(locale)} slug={slug} /> }
`
  )
  await emit(
    'app/(rdx-locales)/[locale]/rdx-search/[source]/route.ts',
    `import { getSearchResponse, getSearchSources, getLocalizedProject } from '${provider}'
import { getProject } from '../../../../../rdx-project'
export const dynamic = 'force-static'
export const dynamicParams = false
export async function generateStaticParams() {
  const project = await getProject()
  return project.localization!.locales.flatMap(locale => getSearchSources(getLocalizedProject(project, locale.path)).map(source => ({ locale: locale.path, ...source })))
}
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string, source: string }> }) { const { locale, source } = await params; return getSearchResponse(getLocalizedProject(await getProject(), locale), source) }
`
  )
  await writeFile(marker, JSON.stringify({ version: 1 }) + '\n')
  for (const file of defaultFiles)
    await rm(await safe(`app/${file}`), { force: true })
}
