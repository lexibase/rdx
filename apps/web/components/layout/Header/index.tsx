'use client'

import { Github } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@rdx/ui/components/logo'
import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'

import { DropdownVersion } from '@/components/Dropdown'

import { useVersion } from '@/hooks/use-version'

export function Header() {
  const { version } = useVersion()
  const href = `/docs/${version}`

  return (
    <header className="w-full flex items-center justify-between px-6 py-2 border-b border-border">
      <Button size="icon" variant="ghost" asChild>
        <Link href="/">
          <Logo className="size-5" />
        </Link>
      </Button>
      <div className="flex items-center md:gap-x-2 h-4">
        <DropdownVersion />
        <Button variant="link" size="lg" asChild className="px-3 md:px-6">
          <Link href={href}>Docs</Link>
        </Button>
        {/* <ModeToggle /> */}
        <Separator orientation="vertical" />
        <Button asChild size="icon" title="GitHub" variant="ghost">
          <a
            className="cursor-default"
            href="https://github.com/duhnunes"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Github className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">GitHub</span>
          </a>
        </Button>
      </div>
    </header>
  )
}
