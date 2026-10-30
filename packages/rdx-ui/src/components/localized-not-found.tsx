'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from './navbar'
import { NotFound } from './not-found'
import { LanguageDropdown } from './language-dropdown'

/** Error boundaries do not receive server route params; use Next's route context. */
export function LocalizedNotFound({
  locales,
  defaultLocale,
  brand,
  homepage,
}: {
  locales: { code: string; path: string; label: string }[]
  defaultLocale: string
  brand: Pick<
    ComponentProps<typeof Navbar>,
    'title' | 'siteTitle' | 'github' | 'showToggleMode'
  > & { logo: ReactNode }
  homepage: boolean
}) {
  const params = useParams<{ locale?: string }>()
  const selected =
    locales.find((locale) => locale.path === params.locale) ??
    locales.find((locale) => locale.code === defaultLocale)!
  const docsHref = `/${selected.path}/docs`
  return (
    <>
      <Navbar
        {...brand}
        lang={selected.code}
        homeHref={homepage ? '/' : docsHref}
        docsHref={docsHref}
        languageMenu={
          <LanguageDropdown
            lang={selected.code}
            current={selected.code}
            options={locales.map((locale) => ({
              ...locale,
              href: `/${locale.path}/docs`,
            }))}
          />
        }
      />
      <NotFound lang={selected.code} href={docsHref} />
    </>
  )
}
