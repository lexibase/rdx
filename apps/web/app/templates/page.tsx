import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Metadata } from 'next'
import {
  Card,
  CardContent,
  CardDescription,
} from '@lexibase/rdx-ui/components/card'
import { CodeBlockCopyButton } from '@lexibase/rdx-ui/components/code-block'

import DocumentationPreview from '@/components/templates/documentation-preview'
import { DocumentationPreviewThumbnail } from '@/components/templates/documentation-preview-thumbnail'
import { TemplatePreviewDialog } from '@/components/templates/template-preview-dialog'

const description =
  'Explore landing page templates and make one your own in RDX.'

export const metadata: Metadata = {
  title: 'Templates',
  description,
}

export default async function TemplatesPage() {
  const source = await readFile(
    path.join(process.cwd(), 'components/templates/documentation-preview.tsx'),
    'utf8'
  )

  return (
    <main
      id="rdx-main"
      tabIndex={-1}
      className="relative min-h-0 flex-1 overflow-y-auto outline-none"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
        <header className="max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Landing page templates
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Pick a layout, try the demo, and make it yours.
          </p>
        </header>
        <ul
          aria-label="Landing page templates"
          className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <li>
            <Card className="h-full gap-0 bg-muted/50 py-0 focus-within:ring-foreground/25 hover:shadow-lg hover:ring-foreground/25 motion-safe:transition-[translate,box-shadow] motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-1">
              <DocumentationPreviewThumbnail />
              <CardContent className="flex flex-1 flex-col justify-between gap-4 py-4">
                <header className="space-y-1">
                  <h2 className="text-base leading-snug font-semibold tracking-tight">
                    Docs in perspective
                  </h2>
                  <CardDescription>
                    A two-column hero with a quickstart section.
                  </CardDescription>
                </header>
                <div className="flex flex-wrap items-center gap-2">
                  <TemplatePreviewDialog
                    title="Docs in perspective"
                    source={source}
                  >
                    <DocumentationPreview />
                  </TemplatePreviewDialog>
                  <CodeBlockCopyButton
                    size="sm"
                    variant="outline"
                    value={source}
                  >
                    Copy code
                  </CodeBlockCopyButton>
                </div>
              </CardContent>
            </Card>
          </li>
        </ul>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          Paste the code into <code>components/home.tsx</code> and set it as
          your <code>homepage.component</code>.
        </p>
      </div>
    </main>
  )
}
