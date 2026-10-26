import { getMessages } from '../lib/i18n'
import type { ReactNode } from 'react'
import { Github } from 'lucide-react'

import { Button } from './button'
import { Logo } from './logo'
import { Separator } from './separator'
import { ModeToggle } from './mode-toggle'

/** Shared composition extracted from apps/web/components/layout/Navbar. */
export function Navbar({
  lang,
  title = '',
  siteTitle = 'RDX',
  logo = <Logo className="size-5" />,
  homeHref = '/',
  docsHref = '/docs',
  docsLink,
  versionMenu,
  search,
  github,
  showToggleMode = false,
}: {
  lang?: string
  title?: string
  siteTitle?: string
  logo?: ReactNode
  homeHref?: string
  docsHref?: string
  docsLink?: ReactNode
  versionMenu?: ReactNode
  search?: ReactNode
  github?: { visible: boolean; url: string }
  showToggleMode?: boolean
}) {
  const messages = getMessages(lang)
  return (
    <nav
      data-rdx-navbar
      aria-label={messages.mainNavigation}
      className="w-full flex flex-wrap shrink-0 items-center justify-between px-6 py-2 border-b border-border gap-y-2"
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={title === '' ? 'icon' : 'default'}
          aria-label={siteTitle}
          href={homeHref}
          className="cursor-default flex items-center gap-2"
        >
          {logo}
          {title !== '' && <span>{title}</span>}
        </Button>
      </div>
      <div className="flex items-center gap-x-1 md:gap-x-2 h-4">
        {search}
        {versionMenu}
        {docsLink ?? (
          <Button variant="link" size="sm" href={docsHref}>
            {messages.docs}
          </Button>
        )}
        {github?.visible && github.url && (
          <>
            <Separator orientation="vertical" />
            <Button
              variant="ghost"
              size="icon"
              title="GitHub"
              aria-label="GitHub"
              href={github.url}
              target={github.url === '#' ? undefined : '_blank'}
              rel={github.url === '#' ? undefined : 'noopener noreferrer'}
              className="cursor-default"
            >
              <Github className="h-[1.2rem] w-[1.2rem]" />
              <span className="sr-only">GitHub</span>
            </Button>
          </>
        )}
        {showToggleMode && (
          <>
            <Separator orientation="vertical" />
            <ModeToggle />
          </>
        )}
      </div>
    </nav>
  )
}
