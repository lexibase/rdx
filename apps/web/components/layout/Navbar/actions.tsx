import { Button } from '@lexibase/rdx-ui/components/button'
import { Separator } from '@lexibase/rdx-ui/components/separator'
import { Github } from 'lucide-react'
import { ModeToggle } from '@lexibase/rdx-ui/components/mode-toggle'

import config from '@/rdx.config'

export function NavbarActions() {
  const github = config.navbar?.actions?.github

  if (!github?.visible || !github.url) return null

  return (
    <>
      {github.visible && (
        <>
          <Separator orientation="vertical" />
          <Button
            variant="ghost"
            size="icon"
            title="GitHub"
            aria-label="GitHub"
            href={github.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-default"
          >
            <Github className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">GitHub</span>
          </Button>
        </>
      )}

      {config.navbar.actions?.showToggleMode && (
        <>
          <Separator orientation="vertical" />
          <ModeToggle />
        </>
      )}
    </>
  )
}
