import type { ComponentType, ReactNode } from 'react'

import {
  getDocument,
  getDocsIndex,
  getDocsPaths,
  getSourceOptions,
  resolveDocsRoute,
  getLocalizedProject,
  getDocsHref,
  getLanguageLinks,
  isFallbackPage,
  withBasePath,
} from '@lexibase/rdx-core'
import {
  changelogPluginName,
  getEditPageHref,
  readChangelog,
} from '@lexibase/rdx-core/config'
import type {
  RdxLocale,
  RdxProject,
  RDXConfig,
  RdxTranslatedHomepageProps,
} from '@lexibase/rdx-types'
import { Button } from '@lexibase/rdx-ui/components/button'
import { Callout } from '@lexibase/rdx-ui/components/callout'
import { LanguageDropdown } from '@lexibase/rdx-ui/components/language-dropdown'
import { DocsSidebar } from '@lexibase/rdx-ui/components/docs-sidebar'
import { DocsToc } from '@lexibase/rdx-ui/components/docs-toc'
import { DocsPageTransition } from '@lexibase/rdx-ui/components/docs-page-transition'
import { DocsSearch } from '@lexibase/rdx-ui/components/docs-search'
import { Home, HomeSection } from '@lexibase/rdx-ui/components/home'
import { SkipLink } from '@lexibase/rdx-ui/components/skip-link'
import {
  ChangelogBadges,
  ChangelogVersions,
  CopyReleaseLink,
} from '@lexibase/rdx-ui/components/changelog-navigation'
import { FooterCredit } from '@lexibase/rdx-ui/components/footer-credit'
import { EditPageLink } from '@lexibase/rdx-ui/components/edit-page-link'
import { CopyPage } from '@lexibase/rdx-ui/components/copy-page'
import { BrandLogo } from '@lexibase/rdx-ui/components/brand-logo'
import { getMdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import { getMessages, formatMessage } from '@lexibase/rdx-ui/lib/i18n'
import { LocaleProvider } from '@lexibase/rdx-ui/providers/locale-provider'
import { Navbar } from '@lexibase/rdx-ui/components/navbar'
import { NotFound } from '@lexibase/rdx-ui/components/not-found'
import { LocalizedNotFound } from '@lexibase/rdx-ui/components/localized-not-found'
import {
  VersionDropdown,
  type VersionOption,
} from '@lexibase/rdx-ui/components/version-dropdown'
import { ThemeProvider } from '@lexibase/rdx-ui/providers/theme-provider'
import { notFound, redirect, permanentRedirect } from 'next/navigation'

import { compileDocumentation } from './mdx'
import { getMarkdownHref } from './markdown'

export {
  createRdxProject,
  getProjectDocsPaths,
  getLocalizedProject,
} from '@lexibase/rdx-core'
export { getSearchResponse, getSearchSources } from './search'
export { getSourceRobots, getRdxRobots, getRdxSitemap } from './indexing'
export {
  getLlmIndexResponse,
  getMarkdownHref,
  getMarkdownPaths,
  getChangelogMarkdownResponse,
  getMarkdownResponse,
  getDocumentMarkdownResponse,
  parseMarkdownPath,
  markdownNotFound,
} from './markdown'
export {
  getDocumentMetadata,
  getHomepageMetadata,
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

function homepageHref(project: RdxProject, locale: RdxLocale | undefined) {
  return locale && locale.code !== project.localization?.defaultLocale
    ? `/${locale.path}`
    : '/'
}

function logoSource(config: RDXConfig) {
  const source = config.navbar?.logo
  return typeof source === 'string'
    ? withBasePath(source, config.basePath)
    : source
}

function RdxHeader({
  project,
  slug,
  onHomepage = false,
}: {
  project: RdxProject
  slug?: string[]
  onHomepage?: boolean
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
        href: getDocsHref(project, edition, destination),
      }
    })
  return (
    <Navbar
      lang={config.lang}
      title={config.navbar?.title ?? ''}
      search={
        config.search ? (
          <DocsSearch
            docsRoot={getDocsHref(project)}
            indexUrl={withBasePath(
              `${project.locale ? `/${project.locale.path}` : ''}/rdx-search/${encodeURIComponent(source.routePrefix || '_')}`,
              config.basePath
            )}
            version={
              source.id === 'current'
                ? messages.current
                : formatMessage(messages.version, { version: source.label })
            }
          />
        ) : undefined
      }
      siteTitle={config.metadata.applicationName}
      logo={<BrandLogo source={logoSource(config)} className="size-5" />}
      homeHref={
        config.homepage?.enabled
          ? homepageHref(project, project.locale)
          : getDocsHref(project)
      }
      docsHref={getDocsHref(project, source)}
      changelogHref={
        config.plugins.some(({ name }) => name === changelogPluginName)
          ? '/changelog'
          : undefined
      }
      languageMenu={
        project.localization ? (
          <LanguageDropdown
            lang={config.lang}
            current={project.locale?.code ?? project.localization.defaultLocale}
            options={(onHomepage
              ? project.localization.locales.map((locale) => ({
                  code: locale.code,
                  label: locale.label,
                  href: homepageHref(project, locale),
                }))
              : getLanguageLinks(project, source, currentSlug)
            ).map((option) => ({
              ...option,
              href: withBasePath(option.href, config.basePath),
            }))}
            contributionUrl={project.localization.contributionUrl}
          />
        ) : undefined
      }
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

export async function ChangelogPage({
  project,
  showHeader = true,
}: {
  project: RdxProject
  showHeader?: boolean
}) {
  const { config } = project
  if (!config.plugins.some(({ name }) => name === changelogPluginName))
    notFound()

  const messages = getMessages(config.lang)
  const formatDate = new Intl.DateTimeFormat(config.lang, {
    dateStyle: 'long',
    timeZone: 'UTC',
  })
  const entries = await Promise.all(
    readChangelog(project.rootDir).map(async (entry) => ({
      ...entry,
      rendered: await compileDocumentation(
        entry.content,
        getMdxComponents(config.lang),
        {
          sourceRoot: project.rootDir,
          sourcePath: entry.sourcePath,
          documents: [],
          publicHref: (href) => withBasePath(href, config.basePath),
        },
        project.syntaxGrammars,
        config.syntaxHighlighting?.themes
      ),
    }))
  )

  return (
    <>
      {showHeader && <RdxHeader project={project} />}
      <main
        id="rdx-main"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto outline-none"
      >
        <div className="mx-auto grid max-w-5xl gap-x-10 px-6 py-10 sm:py-14 md:grid-cols-[10rem_minmax(0,1fr)]">
          <h1 className="mb-8 text-3xl font-semibold tracking-tight md:col-start-2 md:row-start-1">
            {messages.changelog}
          </h1>
          {entries.length > 0 && (
            <ChangelogVersions
              versions={entries.map(({ version }) => version)}
            />
          )}
          <div className="min-w-0 md:col-start-2 md:row-start-2">
            {entries.length === 0 && (
              <p className="text-muted-foreground">{messages.changelogEmpty}</p>
            )}
            {entries.map(({ version, date, title, badges, rendered }) => (
              <article
                key={version}
                id={`v${version}`}
                className="scroll-mt-6 border-t py-7"
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <time dateTime={date}>
                      {formatDate.format(new Date(date))}
                    </time>
                    <a
                      href={`#v${version}`}
                      className="font-mono hover:underline"
                    >
                      v{version}
                    </a>
                    <CopyReleaseLink version={version} />
                  </div>
                  <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
                    <ChangelogBadges badges={badges} />
                    <CopyPage
                      href={withBasePath(
                        getMarkdownHref(
                          `/changelog/${encodeURIComponent(version)}`
                        ),
                        config.basePath
                      )}
                    />
                  </div>
                </div>
                <h2 className="mb-4 text-xl font-semibold">{title}</h2>
                <div className="flex min-w-0 flex-col gap-4">
                  {rendered.content}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

export function HomePage({
  project,
  translatedComponent: TranslatedHome,
  messages,
}: {
  project: RdxProject
  translatedComponent?: ComponentType<RdxTranslatedHomepageProps>
  messages?: Record<string, unknown>
}) {
  const { config } = project
  const docsHref = getDocsHref(project)
  if (!config.homepage?.enabled) redirect(docsHref)
  const homepage = config.homepage
  const CustomHome = homepage.component
  const docsLabel = getMessages(config.lang).docs
  const source = project.sources[0]!
  const categories =
    CustomHome || TranslatedHome
      ? []
      : getDocsIndex(getSourceOptions(project, source))
  const firstPage = categories[0]?.pages[0]
  return (
    <>
      <RdxHeader project={project} onHomepage />
      <main
        id="rdx-main"
        tabIndex={-1}
        className="relative flex-1 min-h-0 overflow-y-auto"
      >
        {CustomHome ? (
          <CustomHome
            lang={config.lang}
            docsHref={docsHref}
            basePath={config.basePath}
          />
        ) : TranslatedHome ? (
          <TranslatedHome
            lang={config.lang}
            docsHref={docsHref}
            basePath={config.basePath}
            t={(text) => {
              const translation =
                messages && Object.hasOwn(messages, text)
                  ? messages[text]
                  : undefined
              return typeof translation === 'string' && translation.trim()
                ? translation
                : text
            }}
          />
        ) : (
          <Home
            title={homepage.title ?? config.metadata.applicationName}
            logo={<BrandLogo source={logoSource(config)} className="size-5" />}
            description={homepage.description ?? config.description}
            buttons={
              homepage.buttons?.map((button) => ({
                ...button,
                href:
                  project.locale && /^\/docs(?:[/?#]|$)/.test(button.href)
                    ? `/${project.locale.path}${button.href}`
                    : button.href,
              })) ?? [{ label: docsLabel, href: docsHref }]
            }
            previewTitle={firstPage?.title}
            previewDescription={firstPage?.description}
          >
            {categories.length > 0 && (
              <HomeSection
                aria-labelledby="home-docs-title"
                className="border-t bg-muted/20"
              >
                <div className="mx-auto w-full max-w-6xl">
                  <h2
                    id="home-docs-title"
                    className="text-3xl font-semibold tracking-tight sm:text-4xl"
                  >
                    {docsLabel}
                  </h2>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                      const page = category.pages[0]!
                      return (
                        <li key={category.id}>
                          <Button
                            href={getDocsHref(project, source, page.slug)}
                            variant="link"
                            className="h-auto whitespace-normal p-0 text-left"
                          >
                            {category.title}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </HomeSection>
            )}
          </Home>
        )}
      </main>
    </>
  )
}

export function NotFoundPage({ project }: { project: RdxProject }) {
  if (project.localization) {
    const { config, localization } = project
    return (
      <LocalizedNotFound
        locales={localization.locales.map((locale) => ({
          ...locale,
          href: withBasePath(`/${locale.path}/docs`, config.basePath),
        }))}
        defaultLocale={localization.defaultLocale}
        homepage={!!config.homepage?.enabled}
        brand={{
          title: config.navbar?.title,
          siteTitle: config.metadata.applicationName,
          github: config.navbar?.actions?.github,
          showToggleMode: config.navbar?.actions?.showToggleMode,
          logo: <BrandLogo source={logoSource(config)} className="size-5" />,
        }}
      />
    )
  }
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
  if (project.localization && !project.locale)
    permanentRedirect(getDocsHref(project, project.sources[0], slug?.join('/')))
  const messages = getMessages(project.config.lang)
  const {
    source,
    slug: currentSlug,
    document,
    categories,
  } = resolveDocsRoute(project, slug)
  if (source.redirectTo !== undefined)
    permanentRedirect(
      getDocsHref(
        project,
        project.sources.find(
          (entry) => entry.routePrefix === source.redirectTo
        ),
        slug?.slice(1).join('/')
      )
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
  const fallback = isFallbackPage(project, source, document.sourcePath)
  const editHref = fallback
    ? undefined
    : getEditPageHref(project, source, document.sourcePath)
  const primaryLocale = (
    source.localization ?? project.localization
  )?.locales.find(
    (locale) => locale.code === project.localization!.defaultLocale
  )
  const originalProject =
    fallback && primaryLocale
      ? getLocalizedProject(project, primaryLocale.path)
      : project
  const contentSource = originalProject.sources.find(
    (entry) => entry.id === source.id
  )!
  const contentOptions = getSourceOptions(originalProject, contentSource)
  const contentCategories = fallback
    ? resolveDocsRoute(originalProject, slug).categories
    : categories
  const contentLanguage = fallback ? primaryLocale!.code : project.config.lang
  const { content } = await compileDocumentation(
    document.content,
    getMdxComponents(project.config.lang),
    {
      sourceRoot: contentOptions.docsDir,
      sourcePath: document.sourcePath,
      routePrefix: source.routePrefix,
      basePath: contentSource.basePath,
      ...(project.config.basePath
        ? {
            publicHref: (href: string) =>
              withBasePath(href, project.config.basePath),
          }
        : {}),
      virtualPaths: !!contentOptions.fallbackDocsDir,
      documents: contentCategories.flatMap((category) => category.pages),
    },
    originalProject.syntaxGrammars,
    originalProject.config.syntaxHighlighting?.themes
  )
  const description =
    typeof document.frontmatter.description === 'string'
      ? document.frontmatter.description
      : null
  const hrefFor = (pageSlug: string) => getDocsHref(project, source, pageSlug)
  const markdownHref = fallback
    ? undefined
    : withBasePath(
        getMarkdownHref(hrefFor(currentSlug)),
        project.config.basePath
      )
  const sidebarCategories = categories.map((category) => ({
    title: category.title,
    links: category.pages.map((page) => ({
      label: page.navTitle ?? page.title,
      highlighting: page.highlighting,
      href: hrefFor(page.slug),
    })),
  }))
  const pages = categories.flatMap((category) => category.pages)
  const index = pages.findIndex((page) => page.slug === currentSlug)
  const title = pages[index]?.title ?? currentSlug
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
                lang={contentLanguage}
                tabIndex={-1}
                className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0 flex-1 outline-none"
              >
                {fallback && (
                  <Callout
                    lang={project.config.lang}
                    variant="note"
                    title={messages.translationUnavailable}
                    data-rdx-translation-fallback
                  >
                    <p>
                      {formatMessage(messages.translationFallback, {
                        requested: project.locale!.label,
                        original: primaryLocale!.label,
                      })}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2">
                      <Button
                        variant="link"
                        nativeButton={false}
                        render={
                          <a
                            href={withBasePath(
                              getDocsHref(
                                originalProject,
                                contentSource,
                                currentSlug
                              ),
                              project.config.basePath
                            )}
                            hrefLang={contentLanguage}
                          />
                        }
                      >
                        {messages.viewOriginal}
                      </Button>
                      {project.localization?.contributionUrl && (
                        <Button
                          variant="link"
                          href={project.localization.contributionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-rdx-translate-page
                        >
                          {messages.translateThisPage}
                          <span className="sr-only">
                            {' '}
                            ({messages.opensInNewTab})
                          </span>
                        </Button>
                      )}
                    </div>
                  </Callout>
                )}
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
                  <div className="mb-2 flex flex-wrap items-start gap-x-4 gap-y-2">
                    <h1 className="min-w-0 max-w-full break-words text-4xl font-bold uppercase">
                      {title}
                    </h1>
                    {markdownHref && (
                      <CopyPage key={markdownHref} href={markdownHref} />
                    )}
                  </div>
                  {description && (
                    <p className="text-sm text-muted-foreground max-w-[726px]">
                      {description}
                    </p>
                  )}
                </header>
                <div className="h-full w-full flex-1 max-w-[960px]">
                  {content}
                </div>
              </main>
              <footer className="flex flex-col">
                {editHref && (
                  <EditPageLink href={editHref} lang={project.config.lang} />
                )}
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
