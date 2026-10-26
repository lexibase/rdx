import type { Metadata } from 'next'
import { getPageMetadata } from '@lexibase/rdx-next/runtime'
import { mdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import { DocsToc } from '@lexibase/rdx-ui/components/docs-toc'
import { notFound, redirect } from 'next/navigation'

import config from '@/rdx.config'
import { VersionBanner } from '@/components/Page/version-banner'
import { DocHeader } from '@/components/Page/doc-header'
import { DocFooter } from '@/components/Page/doc-footer'
import { compileDocument } from '@/lib/compile-documentation'
import { getDocumentation } from '@/lib/docs'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ version: string; doc: string[] }>
}): Promise<Metadata> {
  const { version, doc } = await params
  const documentation = await getDocumentation()
  const document = documentation.document(version, doc.join('/'))
  if (!document) notFound()
  const page = documentation
    .pages(version)
    .find((entry) => entry.sourcePath === document.sourcePath)!
  return getPageMetadata(config, page)
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ version: string; doc: string[] }>
}) {
  const { version, doc } = await params
  const documentation = await getDocumentation()
  const slug = doc.join('/')
  const document = documentation.document(version, slug)
  if (!document) return notFound()
  const filename = documentation
    .pages(version)
    .find((page) => page.sourcePath === document.sourcePath)!.slug
  if (slug !== filename) redirect(`/docs/${version}/${filename}`)

  const result = await compileDocument(
    version,
    slug,
    mdxComponents,
    documentation
  )
  if (!result) return notFound()
  const { content } = result

  return (
    <section
      className={`w-full min-h-full px-7 flex flex-col gap-5 pb-8 md:py-8 ${config.TOC ? 'xl:pr-20' : ''}`}
    >
      {config.TOC && <DocsToc key={`${version}/${doc.join('/')}`} />}
      <div className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0 flex-1">
        <header className="mb-6">
          <VersionBanner
            version={version}
            currentVersion={
              documentation.editions.find(
                (edition) => edition.kind === 'version'
              )?.id
            }
          />
          <DocHeader version={version} filename={filename} />
        </header>
        <main id="rdx-main" className="h-full w-full flex-1 max-w-[960px]">
          {content}
        </main>
      </div>
      <DocFooter version={version} filename={filename} />
    </section>
  )
}
