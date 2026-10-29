import type { ReactNode } from 'react'

import {
  getDocument,
  getDocsPaths,
  getSourceOptions,
  resolveDocsRoute,
} from '@lexibase/rdx-core'
import type { RdxProject, RDXConfig } from '@lexibase/rdx-types'
import { Button } from '@lexibase/rdx-ui/components/button'
import { DocsSidebar } from '@lexibase/rdx-ui/components/docs-sidebar'
import { DocsToc } from '@lexibase/rdx-ui/components/docs-toc'
import { DocsPageTransition } from '@lexibase/rdx-ui/components/docs-page-transition'
import { DocsSearch } from '@lexibase/rdx-ui/components/docs-search'
import { Home } from '@lexibase/rdx-ui/components/home'
import { SkipLink } from '@lexibase/rdx-ui/components/skip-link'
import { FooterCredit } from '@lexibase/rdx-ui/components/footer-credit'
import { Logo } from '@lexibase/rdx-ui/components/logo'
import { getMdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import { getMessages, formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import { LocaleProvider } from '@lexibase/rdx-ui/providers/locale-provider'
import { Navbar } from '@lexibase/rdx-ui/components/navbar'
import { NotFound } from '@lexibase/rdx-ui/components/not-found'
import {
  VersionDropdown,
  type VersionOption,
} from '@lexibase/rdx-ui/components/version-dropdown'
import { ThemeProvider } from '@lexibase/rdx-ui/providers/theme-provider'
import { notFound, redirect, permanentRedirect } from 'next/navigation'

import { compileDocumentation } from './mdx'

export { createRdxProject, getProjectDocsPaths } from '@lexibase/rdx-core'
export { getSearchResponse, getSearchSources } from './search'
export { getSourceRobots, getRdxRobots, getRdxSitemap } from './indexing'
export {
  getDocumentMetadata,
  getPageMetadata,
  getRdxMetadata,
} from './metadata'

export function RdxLayout({
  children,
  config,
  bodyClassName,
}: {
  children: ReactNode
  config: RDXConfig
  bodyClassName?: string
}) {
  return (
    <html suppressHydrationWarning lang={config.lang ?? 'en'}>
      <body className={bodyClassName}>
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme={config.theme?.defaultTheme ?? 'system'}
        >
          <LocaleProvider lang={config.lang}>
            <SkipLink lang={config.lang} />
            <div className="flex flex-col h-dvh">{children}</div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

function RdxHeader({
  project,
  slug,
}: {
  project: RdxProject
  slug?: string[]
}) {
  const { config } = project
  const messages = getMessages(config.lang)
  const { source, slug: currentSlug } = resolveDocsRoute(project, slug)
  const options: VersionOption[] = project.sources
    .filter((edition) => edition.redirectTo === undefined)
    .map((edition) => {
      const docs = getSourceOptions(project, edition)
      const destination =
        currentSlug && getDocument(currentSlug, docs)
          ? currentSlug
          : getDocsPaths(docs)[0]
      return {
        id: edition.id,
        label:
          edition.id === 'current'
            ? messages.current
            : formatMessage(messages.version, { version: edition.label }),
        kind:
          edition.id === 'current'
            ? 'live'
            : edition.badge === 'Archived'
              ? 'archived'
              : 'version',
        href: ['/docs', edition.routePrefix, destination]
          .filter(Boolean)
          .join('/'),
      }
    })
  const BrandLogo = config.navbar?.logo ?? Logo
  return (
    <Navbar
      lang={config.lang}
      title={config.navbar?.title ?? ''}
      search={
        config.search ? (
          <DocsSearch
            indexUrl={`/rdx-search/${encodeURIComponent(source.routePrefix || '_')}`}
            version={
              source.id === 'current'
                ? messages.current
                : formatMessage(messages.version, { version: source.label })
            }
          />
        ) : undefined
      }
      siteTitle={config.metadata.applicationName}
      logo={<BrandLogo className="size-5" />}
      homeHref={config.homepage?.enabled ? '/' : '/docs'}
      docsHref={['/docs', source.routePrefix].filter(Boolean).join('/')}
      versionMenu={
        project.sources.length > 1 ? (
          <VersionDropdown options={options} currentId={source.id} />
        ) : undefined
      }
      github={config.navbar?.actions?.github}
      showToggleMode={config.navbar?.actions?.showToggleMode}
    />
  )
}

export function HomePage({ project }: { project: RdxProject }) {
  const { config } = project
  if (!config.homepage?.enabled) redirect('/docs')
  const homepage = config.homepage
  const CustomHome = homepage.component
  const BrandLogo = config.navbar?.logo ?? Logo
  return (
    <>
      <RdxHeader project={project} />
      <main
        id="rdx-main"
        tabIndex={-1}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {CustomHome ? (
          <CustomHome />
        ) : (
          <Home
            title={homepage.title ?? config.metadata.applicationName}
            logo={
              <BrandLogo className="size-52 hover:scale-105 hover:rotate-1 transition-[scale,rotation] duration-1000" />
            }
            description={homepage.description}
            buttons={homepage.buttons}
          />
        )}
      </main>
    </>
  )
}

export function NotFoundPage({ project }: { project: RdxProject }) {
  return (
    <>
      <RdxHeader project={project} />
      <NotFound lang={project.config.lang} />
    </>
  )
}

export async function DocsPage({
  slug,
  project,
}: {
  slug?: string[]
  project: RdxProject
}) {
  const messages = getMessages(project.config.lang)
  const {
    source,
    slug: currentSlug,
    document,
    categories,
  } = resolveDocsRoute(project, slug)
  if (source.redirectTo !== undefined)
    permanentRedirect(
      [
        '/docs',
        source.redirectTo,
        ...(slug?.slice(1).map(encodeURIComponent) ?? []),
      ].join('/')
    )
  if (!currentSlug)
    return (
      <>
        <RdxHeader project={project} slug={slug} />
        <main id="rdx-main" tabIndex={-1} className="p-8">
          <h1>{messages.documentationReady}</h1>
          <p>{messages.addDocument}</p>
        </main>
      </>
    )
  if (!document) notFound()
  const { content } = await compileDocumentation(
    document.content,
    getMdxComponents(project.config.lang),
    {
      sourceRoot: getSourceOptions(project, source).docsDir,
      sourcePath: document.sourcePath,
      routePrefix: source.routePrefix,
      documents: categories.flatMap((category) => category.pages),
    }
  )
  const title =
    typeof document.frontmatter.title === 'string'
      ? document.frontmatter.title
      : currentSlug
  const description =
    typeof document.frontmatter.description === 'string'
      ? document.frontmatter.description
      : null
  const hrefFor = (pageSlug: string) =>
    ['/docs', source.routePrefix, pageSlug].filter(Boolean).join('/')
  const sidebarCategories = categories.map((category) => ({
    title: category.title,
    links: category.pages.map((page) => ({
      label: page.title,
      href: hrefFor(page.slug),
    })),
  }))
  const pages = categories.flatMap((category) => category.pages)
  const index = pages.findIndex((page) => page.slug === currentSlug)
  const previous = pages[index - 1]
  const next = pages[index + 1]
  const category = categories.find((entry) =>
    entry.pages.some((page) => page.slug === currentSlug)
  )
  return (
    <>
      <RdxHeader project={project} slug={slug} />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <DocsSidebar
          categories={sidebarCategories}
          pathname={hrefFor(currentSlug)}
        />
        <div
          data-rdx-docs-scroll
          className="relative flex-1 min-w-0 h-full overflow-y-auto pt-12 md:pt-0 outline-none"
        >
          {project.config.TOC && <DocsToc key={hrefFor(currentSlug)} />}
          <DocsPageTransition
            previousHref={previous ? hrefFor(previous.slug) : undefined}
            nextHref={next ? hrefFor(next.slug) : undefined}
          >
            <section
              className={`w-full min-h-full bg-background px-7 flex flex-col gap-5 pb-8 md:py-8 ${project.config.TOC ? 'xl:pr-20' : ''}`}
            >
              <main
                id="rdx-main"
                tabIndex={-1}
                className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0 flex-1 outline-none"
              >
                <header className="mb-6">
                  {source.badge && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {source.badge === 'Archived'
                        ? messages.archivedVersion
                        : source.badge}
                    </p>
                  )}
                  <span className="text-xs text-zinc-600 font-semibold uppercase block -mb-0.5">
                    {category?.title}
                  </span>
                  <h1 className="text-4xl uppercase font-bold mb-2">{title}</h1>
                  {description && (
                    <p className="text-sm text-ring max-w-[726px]">
                      {description}
                    </p>
                  )}
                </header>
                <div className="h-full w-full flex-1 max-w-[960px]">
                  {content}
                </div>
              </main>
              <footer className="flex flex-col">
                <section className="flex items-center justify-between">
                  {previous ? (
                    <Button
                      variant="outline"
                      size="sm"
                      href={hrefFor(previous.slug)}
                      transitionTypes={['rdx-doc-back']}
                    >
                      {previous.title}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {messages.previous}
                    </Button>
                  )}
                  {next ? (
                    <Button
                      variant="outline"
                      size="sm"
                      href={hrefFor(next.slug)}
                      transitionTypes={['rdx-doc-forward']}
                    >
                      {next.title}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {messages.next}
                    </Button>
                  )}
                </section>
                <FooterCredit
                  lang={project.config.lang}
                  name={project.config.metadata.applicationName}
                  since={project.config.metadata.since}
                />
              </footer>
            </section>
          </DocsPageTransition>
        </div>
      </div>
    </>
  )
}
