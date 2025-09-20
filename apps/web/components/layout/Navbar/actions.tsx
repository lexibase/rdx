import { Button } from "@rdx/ui/components/button";
import { Separator } from "@rdx/ui/components/separator";
import { Github } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@rdx/ui/components/mode-toggle";

import config from "@/rdx.config";

export function NavbarActions() {
  const github = config.navbar?.actions?.github;

  if (!github?.visible || !github.url) return null;

  return (
    <>
      {github.visible && (
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

      {config.navbar.actions?.showToggleMode && (
        <>
          <Separator orientation="vertical" />
          <ModeToggle />
        </>
      )}
    </>
  );
}
