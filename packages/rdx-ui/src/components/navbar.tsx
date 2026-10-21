import type { ReactNode } from 'react'
import { Github } from 'lucide-react'
import Link from 'next/link'

import { Button } from './button'
import { Logo } from './logo'
import { Separator } from './separator'
import { ModeToggle } from './mode-toggle'

/** Shared composition extracted from apps/web/components/layout/Navbar. */
export function Navbar({
  title = '',
  siteTitle = 'RDX',
  logo = <Logo className="size-5" />,
  homeHref = '/',
  docsHref = '/docs',
  docsLink,
  versionMenu,
  github,
  showToggleMode = false,
}: {
  title?: string
  siteTitle?: string
  logo?: ReactNode
  homeHref?: string
  docsHref?: string
  docsLink?: ReactNode
  versionMenu?: ReactNode
  github?: { visible: boolean; url: string }
  showToggleMode?: boolean
}) {
  return (
    <nav
      data-rdx-navbar
      aria-label="Main navigation"
      className="w-full flex flex-wrap shrink-0 items-center justify-between px-6 py-2 border-b border-border gap-y-2"
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={title === '' ? 'icon' : 'default'}
          asChild
          aria-label={siteTitle}
        >
          <Link
            href={homeHref}
            className="cursor-default flex items-center gap-2"
          >
            {logo}
            {title !== '' && <span>{title}</span>}
          </Link>
        </Button>
      </div>
      <div className="flex items-center md:gap-x-2 h-4">
        {versionMenu}
        {docsLink ?? (
          <Button variant="link" size="sm" asChild>
            <Link href={docsHref}>Docs</Link>
          </Button>
        )}
        {github?.visible && github.url && (
          <>
            <Separator orientation="vertical" />
            <Button
              variant="ghost"
              size="icon"
              title="GitHub"
              asChild
              aria-label="GitHub"
            >
              <Link
                className="cursor-default"
                href={github.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">GitHub</span>
              </Link>
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
