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
import { notFound } from 'next/navigation'

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
  const brand = config.navbar?.title ?? config.title

  return (
    <html
      lang={config.lang ?? 'en'}
      data-theme={config.theme?.defaultTheme ?? 'system'}
    >
      <body>
        <header className="rdx-header">
          <Link className="rdx-brand" href="/docs" aria-label={config.title}>
            {brand}
          </Link>
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
        </header>
        {children}
      </body>
    </html>
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
      <main className="rdx-empty-state">
        <h1>Your documentation is ready.</h1>
        <p>Add an `.mdx` file inside `docs/` to create your first page.</p>
      </main>
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
    <div className="rdx-docs-layout">
      <aside className="rdx-sidebar" aria-label="Documentation navigation">
        {project.sources.length > 1 && (
          <nav className="rdx-editions" aria-label="Documentation editions">
            {project.sources.map((edition) => {
              const options = getSourceOptions(project, edition)
              const destination = getDocument(currentSlug, options)
                ? currentSlug
                : getDocsPaths(options)[0]
              const href = ['/docs', edition.routePrefix, destination]
                .filter(Boolean)
                .join('/')
              return (
                <Link
                  key={edition.id}
                  href={href}
                  aria-current={edition.id === source.id ? 'page' : undefined}
                >
                  {edition.label}
                  {edition.badge ? ` (${edition.badge})` : ''}
                </Link>
              )
            })}
          </nav>
        )}
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
      </aside>

      <main className="rdx-document">
        <header className="rdx-document-header">
          {source.badge && <p className="rdx-source-badge">{source.badge}</p>}
          <p className="rdx-breadcrumb">{currentSlug}</p>
          <h1>{title}</h1>
          {description && <p className="rdx-description">{description}</p>}
        </header>
        <article className="rdx-mdx-content">{content}</article>
      </main>
    </div>
  )
}
