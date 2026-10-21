import type { Metadata } from 'next'

import { RdxLayout } from '@lexibase/rdx-next/runtime'

import { getProject } from '../rdx-project'

import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getProject()
  return {
    title: { default: config.title, template: `%s | ${config.title}` },
    description: config.description,
  }
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
