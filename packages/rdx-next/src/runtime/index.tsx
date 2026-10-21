import type { ComponentProps, ReactNode } from 'react'

import {
  getDocument,
  getDocsPaths,
  getSourceOptions,
  resolveDocsRoute,
} from '@lexibase/rdx-core'
import type { RdxProject, RdxRuntimeConfig } from '@lexibase/rdx-types'
import { compileMDX } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export { createRdxProject, getProjectDocsPaths } from '@lexibase/rdx-core'

const mdxComponents = {
  h1: (props: ComponentProps<'h1'>) => <h1 {...props} />,
  h2: (props: ComponentProps<'h2'>) => <h2 {...props} />,
  h3: (props: ComponentProps<'h3'>) => <h3 {...props} />,
  p: (props: ComponentProps<'p'>) => <p {...props} />,
  ul: (props: ComponentProps<'ul'>) => <ul {...props} />,
  ol: (props: ComponentProps<'ol'>) => <ol {...props} />,
  li: (props: ComponentProps<'li'>) => <li {...props} />,
  blockquote: (props: ComponentProps<'blockquote'>) => (
    <blockquote {...props} />
  ),
  pre: (props: ComponentProps<'pre'>) => <pre {...props} />,
  code: (props: ComponentProps<'code'>) => <code {...props} />,
  a: ({ href, ...props }: ComponentProps<'a'>) => {
    const isExternal = href?.startsWith('http')

    return (
      <a
        href={href}
        rel={isExternal ? 'noreferrer' : undefined}
        target={isExternal ? '_blank' : undefined}
        {...props}
      />
    )
  },
}

export function RdxLayout({
  children,
  config,
}: {
  children: ReactNode
  config: RdxRuntimeConfig
}) {
  return (
    <html
      lang={config.lang ?? 'en'}
      data-theme={config.theme?.defaultTheme ?? 'system'}
    >
      <body>
        <a className="rdx-skip-link" href="#rdx-main">
          Skip to content
        </a>
        {children}
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
  const brand = config.navbar?.title ?? config.title
  return (
    <header className="rdx-header">
      <Link
        className="rdx-brand"
        href={config.homepage?.enabled ? '/' : '/docs'}
        aria-label={config.title}
      >
        {brand}
      </Link>
      <nav className="rdx-header-actions" aria-label="Main navigation">
        {config.homepage?.enabled && <Link href="/">Home</Link>}
        <Link href="/docs">Documentation</Link>
        {project.sources.length > 1 && (
          <details className="rdx-version-menu">
            <summary aria-label={`Documentation version: ${source.label}`}>
              {source.label}
              {source.badge ? ` (${source.badge})` : ''}
            </summary>
            <ul aria-label="Documentation versions">
              {project.sources.map((edition) => {
                const options = getSourceOptions(project, edition)
                const destination =
                  currentSlug && getDocument(currentSlug, options)
                    ? currentSlug
                    : getDocsPaths(options)[0]
                const href = ['/docs', edition.routePrefix, destination]
                  .filter(Boolean)
                  .join('/')
                return (
                  <li key={edition.id}>
                    <Link
                      href={href}
                      aria-current={
                        edition.id === source.id ? 'true' : undefined
                      }
                    >
                      {edition.label}
                      {edition.badge ? ` (${edition.badge})` : ''}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </details>
        )}
        {config.navbar?.actions?.github?.visible &&
          config.navbar.actions.github.url && (
            <a
              className="rdx-github-link"
              href={config.navbar.actions.github.url}
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          )}
      </nav>
    </header>
  )
}

export function HomePage({ project }: { project: RdxProject }) {
  const { config } = project
  if (!config.homepage?.enabled) redirect('/docs')
  const homepage = config.homepage
  const buttons = homepage.buttons ?? [
    { label: 'Read the documentation', href: '/docs' },
  ]
  return (
    <>
      <RdxHeader project={project} />
      <main id="rdx-main" tabIndex={-1} className="rdx-homepage">
        <p className="rdx-homepage-eyebrow">{config.title}</p>
        <h1>{homepage.title ?? config.title}</h1>
        <p className="rdx-homepage-description">
          {homepage.description ?? config.description}
        </p>
        <div className="rdx-homepage-buttons">
          {buttons.map((button, index) => (
            <Link
              key={`${index}:${button.href}`}
              className={
                index === 0 ? 'rdx-button rdx-button-primary' : 'rdx-button'
              }
              href={button.href}
            >
              {button.label}
            </Link>
          ))}
        </div>
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

  if (!currentSlug) {
    return (
      <>
        <RdxHeader project={project} slug={slug} />
        <main id="rdx-main" tabIndex={-1} className="rdx-empty-state">
          <h1>Your documentation is ready.</h1>
          <p>Add an `.mdx` file inside `docs/` to create your first page.</p>
        </main>
      </>
    )
  }

  if (!document) notFound()

  const { content } = await compileMDX({
    source: document.content,
    components: mdxComponents,
  })

  const title =
    typeof document.frontmatter.title === 'string'
      ? document.frontmatter.title
      : currentSlug
  const description =
    typeof document.frontmatter.description === 'string'
      ? document.frontmatter.description
      : null

  return (
    <>
      <RdxHeader project={project} slug={slug} />
      <div className="rdx-docs-layout">
        <aside className="rdx-sidebar" aria-label="Documentation navigation">
          <details className="rdx-sidebar-menu" open>
            <summary>On this site</summary>
            <nav aria-label="Documentation pages">
              {categories.map((category) => (
                <section key={category.id} className="rdx-sidebar-category">
                  <h2>{category.title}</h2>
                  <ul>
                    {category.pages.map((page) => {
                      const href = ['/docs', source.routePrefix, page.slug]
                        .filter(Boolean)
                        .join('/')
                      const isCurrentPage = page.slug === currentSlug

                      return (
                        <li key={page.slug}>
                          <Link
                            aria-current={isCurrentPage ? 'page' : undefined}
                            className={isCurrentPage ? 'is-active' : undefined}
                            href={href}
                          >
                            {page.title}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </nav>
          </details>
        </aside>

        <main id="rdx-main" tabIndex={-1} className="rdx-document">
          <header className="rdx-document-header">
            {source.badge && <p className="rdx-source-badge">{source.badge}</p>}
            <p className="rdx-breadcrumb">{currentSlug}</p>
            <h1>{title}</h1>
            {description && <p className="rdx-description">{description}</p>}
          </header>
          <article className="rdx-mdx-content">{content}</article>
        </main>
      </div>
    </>
  )
}
