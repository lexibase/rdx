'use client'

import { Github } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'
import React from 'react'
import { ModeToggle } from '@rdx/ui/components/mode-toggle'

import { DropdownVersion } from '@/components/Dropdown'
import { useVersion } from '@/hooks/use-version'
import config from '@/rdx.config'

export function Navbar() {
  const { currentVersion } = useVersion()
  const href = `/docs/${currentVersion}`
  const LogoComponent = config.navbar.logo

  return (
    <nav className="w-full flex items-center justify-between px-6 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        {config.navbar.title === '' ? (
          <Button size="icon" variant="ghost" asChild>
            <Link href="/" className="cursor-default">
              <LogoComponent className="size-5" />
            </Link>
          </Button>
        ) : (
          <Button size="default" variant="ghost" asChild>
            <Link href="/" className="cursor-default flex items-center gap-2">
              <LogoComponent className="size-5" />
              <span className="">{config.navbar.title}</span>
            </Link>
          </Button>
        )}
      </div>
      <div className="flex items-center md:gap-x-2 h-4">
        <DropdownVersion />
        {config.navbar.items.map((link) => (
          <Button key={link.label} variant="link" size="sm" asChild>
            <Link href={link.href ?? href}>{link.label}</Link>
          </Button>
        ))}
        {config.navbar.actions.githubButton && (
          <>
            <Separator orientation="vertical" />
            <Button asChild size="icon" title="GitHub" variant="ghost">
              <Link
                className="cursor-default"
                href={config.navbar.actions.githubUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Github className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">GitHub</span>
              </Link>
            </Button>
          </>
        )}
        {config.navbar.actions.showToggleMode && (
          <>
            <Separator orientation="vertical" />
            <ModeToggle />
          </>
        )}
      </div>
    </nav>
  )
}
