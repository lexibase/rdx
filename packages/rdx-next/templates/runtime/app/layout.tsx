import type { Metadata } from 'next'

import { RdxLayout } from '@lexibase/rdx-next/runtime'

import config from '../../rdx.config'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: config.title,
    template: `%s | ${config.title}`,
  },
  description: config.description,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <RdxLayout config={config}>{children}</RdxLayout>
}
