import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "@rdx/ui/components/dropdown-menu";
import { Github, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

export function ExternalLink() {
  return (
    <DropdownMenuItem
      className="bg-red-900/20 text-primary/60 border-1 border-red-800/40 capitalize hover:!bg-red-900/30"
      asChild
    >
      <Link
        href="https://github.com/duhnunes/mdxRenderDocs"
        target="_blank"
        rel="noopener noreferrer"
      >
        Version 1.1.1
        <DropdownMenuShortcut>
          <div className="flex items-center gap-2">
            <Github className="size-4" />
            <ExternalLinkIcon className="size-4" />
          </div>
        </DropdownMenuShortcut>
      </Link>
    </DropdownMenuItem>
  );
}
