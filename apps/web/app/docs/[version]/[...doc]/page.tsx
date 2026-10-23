import { mdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import { DocsToc } from '@lexibase/rdx-ui/components/docs-toc'
import { notFound } from 'next/navigation'
import { mdxLoader, RdxDocumentNotFoundError } from '@rdx/core'

import versionsRaw from '@/versions.json'
import config from '@/rdx.config'
import { VersionBanner } from '@/components/Page/version-banner'
import { DocHeader } from '@/components/Page/doc-header'
import { DocFooter } from '@/components/Page/doc-footer'

export default async function DocPage({
  params,
}: {
  params: Promise<{ version: string; doc: string[] }>
}) {
  const { version, doc } = await params
  const filename = doc.at(-1)
  if (!filename) return notFound()

  let content
  try {
    const result = await mdxLoader({
      filename,
      version,
      versionsRaw,
      mdxComponents,
    })
    content = result.content
  } catch (error) {
    if (error instanceof RdxDocumentNotFoundError) return notFound()
    throw error
  }

  return (
    <section
      className={`w-full min-h-full px-7 flex flex-col gap-5 pb-8 md:py-8 ${config.TOC ? 'xl:pr-20' : ''}`}
    >
      {config.TOC && <DocsToc key={`${version}/${doc.join('/')}`} />}
      <div className="w-full flex flex-col gap-5 md:mx-auto md:max-w-[860px] pt-14 md:pt-0 flex-1">
        <header className="mb-6">
          <VersionBanner version={version} versionsRaw={versionsRaw} />
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
