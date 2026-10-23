import type { ReactNode } from 'react'

import {
  getDocument,
  getDocsPaths,
  getSourceOptions,
  resolveDocsRoute,
} from '@lexibase/rdx-core'
import type { RdxProject, RdxRuntimeConfig } from '@lexibase/rdx-types'
import { Button } from '@lexibase/rdx-ui/components/button'
import { ButtonLink } from '@lexibase/rdx-ui/components/button-link'
import { DocsSidebar } from '@lexibase/rdx-ui/components/docs-sidebar'
import { DocsToc } from '@lexibase/rdx-ui/components/docs-toc'
import { Home } from '@lexibase/rdx-ui/components/home'
import { Logo } from '@lexibase/rdx-ui/components/logo'
import { mdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import { Navbar } from '@lexibase/rdx-ui/components/navbar'
import {
  VersionDropdown,
  type VersionOption,
} from '@lexibase/rdx-ui/components/version-dropdown'
import { ThemeProvider } from '@lexibase/rdx-ui/providers/theme-provider'
import { notFound, redirect } from 'next/navigation'

import { compileDocumentation } from './mdx'

export { createRdxProject, getProjectDocsPaths } from '@lexibase/rdx-core'

export function RdxLayout({
  children,
  config,
  bodyClassName,
}: {
  children: ReactNode
  config: RdxRuntimeConfig
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
          <a className="rdx-skip-link" href="#rdx-main">
            Skip to content
          </a>
          <div className="flex flex-col h-dvh">{children}</div>
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
  const { source, slug: currentSlug } = resolveDocsRoute(project, slug)
  const options: VersionOption[] = project.sources.map((edition) => {
    const docs = getSourceOptions(project, edition)
    const destination =
      currentSlug && getDocument(currentSlug, docs)
        ? currentSlug
        : getDocsPaths(docs)[0]
    return {
      id: edition.id,
      label: edition.id === 'current' ? 'Current' : `Version ${edition.label}`,
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
      title={config.navbar?.title ?? ''}
      siteTitle={config.title}
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
            title={homepage.title ?? config.title}
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

export async function DocsPage({
  slug,
  project,
}: {
  slug?: string[]
  project: RdxProject
}) {
  const {
    source,
    slug: currentSlug,
    document,
    categories,
  } = resolveDocsRoute(project, slug)
  if (!currentSlug)
    return (
      <>
        <RdxHeader project={project} slug={slug} />
        <main id="rdx-main" tabIndex={-1} className="p-8">
          <h1>Your documentation is ready.</h1>
          <p>
            Add an .mdx file inside your configured documentation directory.
          </p>
        </main>
      </>
    )
  if (!document) notFound()
  const { content } = await compileDocumentation(
    document.content,
    mdxComponents,
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
        <div className="flex-1 min-w-0 h-full overflow-y-auto pt-12 md:pt-0 outline-none">
          {project.config.TOC && <DocsToc key={hrefFor(currentSlug)} />}
          <section
            className={`w-full min-h-full px-7 flex flex-col gap-5 pb-8 md:py-8 ${project.config.TOC ? 'xl:pr-20' : ''}`}
          >
            <div className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0 flex-1">
              <header className="mb-6">
                {source.badge && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {source.badge}
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
              <main
                id="rdx-main"
                tabIndex={-1}
                className="h-full w-full flex-1 max-w-[960px]"
              >
                {content}
              </main>
            </div>
            <footer className="flex flex-col">
              <section className="flex items-center justify-between">
                {previous ? (
                  <ButtonLink
                    variant="outline"
                    size="sm"
                    href={hrefFor(previous.slug)}
                  >
                    {previous.title}
                  </ButtonLink>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                )}
                {next ? (
                  <ButtonLink
                    variant="outline"
                    size="sm"
                    href={hrefFor(next.slug)}
                  >
                    {next.title}
                  </ButtonLink>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                )}
              </section>
              <section className="flex items-center justify-center w-full py-5">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()}{' '}
                  <strong>{project.config.title}</strong>
                </p>
              </section>
            </footer>
          </section>
        </div>
      </div>
    </>
  )
}
