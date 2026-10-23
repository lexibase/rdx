import { docsIndexer } from '@rdx/core'

import { Sidebar } from '@/components/layout/Sidebar'

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const resolvedParams = version || 'canary'
  const categories = docsIndexer(resolvedParams)

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      <Sidebar categories={categories} />
      <div
        data-rdx-docs-scroll
        className="relative flex-1 min-w-0 h-full overflow-y-auto pt-12 md:pt-0 outline-none"
      >
        {children}
      </div>
    </div>
  )
}
