import type { Metadata } from 'next'
import { Bebas_Neue, Space_Mono } from 'next/font/google'
import '@lexibase/rdx-ui/globals.css'
import '../rdx.css'
import { LocaleProvider } from '@lexibase/rdx-ui/providers/locale-provider'
import { ThemeProvider } from '@lexibase/rdx-ui/providers/theme-provider'
import { SkipLink } from '@lexibase/rdx-ui/components/skip-link'
import { getRdxMetadata } from '@lexibase/rdx-next/runtime'

import { Navbar } from '@/components/layout/Navbar'
import { VersionProvider } from '@/contexts/version-docs'
import config from '@/rdx.config'
import { getDocumentation } from '@/lib/docs'

const bebas = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: '400',
})
const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = getRdxMetadata(config)

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { editions } = await getDocumentation()
  return (
    <html suppressHydrationWarning lang={config.lang}>
      <head>
        <meta
          content={config.metadata.applicationName}
          name="apple-mobile-web-app-title"
        />

        {/* MOBILE BAR COLOR */}
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className={`${bebas.variable} ${spaceMono.variable} antialiased`}>
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme={config.theme?.defaultTheme ?? 'system'}
        >
          <LocaleProvider lang={config.lang}>
            <SkipLink lang={config.lang} />
            <VersionProvider editions={editions}>
              <div className="flex flex-col h-screen">
                <Navbar />
                {children}
              </div>
            </VersionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
