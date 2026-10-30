'use client'

import { ExternalLink, Languages } from 'lucide-react'
import Link from 'next/link'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { getMessages } from '../lib/i18n'

/** Locale navigation composes the shared shadcn/ui Base UI menu. */
export function LanguageDropdown({
  options,
  current,
  lang,
  contributionUrl,
}: {
  options: { code: string; label: string; href: string }[]
  current: string
  lang?: string
  contributionUrl?: string
}) {
  const selected = options.find((option) => option.code === current)
  if (!selected) return null
  const messages = getMessages(lang)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={`${getMessages(lang).documentationLanguage}: ${selected.label}`}
            data-rdx-language-trigger
          />
        }
      >
        <Languages className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{selected.label}</span>
        <span className="sm:hidden">{selected.code}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8}>
        <DropdownMenuGroup>
          {options.map((option) => (
            <DropdownMenuLinkItem
              key={option.code}
              className={option.code === current ? 'bg-accent/30' : undefined}
              closeOnClick
              render={<Link href={option.href} hrefLang={option.code} />}
              aria-current={option.code === current ? 'true' : undefined}
            >
              {option.label}
            </DropdownMenuLinkItem>
          ))}
        </DropdownMenuGroup>
        {contributionUrl && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLinkItem
              closeOnClick
              render={
                <a
                  href={contributionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              data-rdx-help-translate
            >
              {messages.helpTranslate}
              <ExternalLink className="ml-auto size-3.5" aria-hidden="true" />
              <span className="sr-only"> ({messages.opensInNewTab})</span>
            </DropdownMenuLinkItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
