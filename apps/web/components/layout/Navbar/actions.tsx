import { Button } from '@rdx/ui/components/button'
import { Separator } from '@rdx/ui/components/separator'
import { Github } from 'lucide-react'
import Link from 'next/link'
import { ModeToggle } from '@rdx/ui/components/mode-toggle'

import config from '@/rdx.config'

export function NavbarActions() {
  return (
    <>
      {config.navbar.actions.githubButton && (
        <>
          <Separator orientation="vertical" />
          <Button variant="ghost" size="icon" title="GitHub" asChild>
            <Link
              className="cursor-default"
              href={config.navbar.actions.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
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
    </>
  )
}
