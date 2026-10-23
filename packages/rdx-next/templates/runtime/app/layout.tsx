import type { Metadata } from 'next'

import { getRdxMetadata, RdxLayout } from '@lexibase/rdx-next/runtime'

import { getProject } from '../rdx-project'

import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getProject()
  return getRdxMetadata(config)
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { config } = await getProject()
  return (
    <RdxLayout config={config} bodyClassName="antialiased">
      {children}
    </RdxLayout>
  )
}
