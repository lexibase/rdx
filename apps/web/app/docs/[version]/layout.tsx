import { Sidebar } from '@/components/layout/Sidebar'

import { getAllDocs } from '@/lib/docs'

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ version: string }>
}) {
  const { version } = await params
  const resolvedParams = version || 'canary'
  const categories = getAllDocs(resolvedParams)

  return (
    <div className="flex flex-1 overflow-hidden relative">
      <Sidebar categories={categories} />
      <div className="flex-1 h-full overflow-y-auto pt-12 md:pt-0">
        {children}
      </div>
    </div>
  )
}
