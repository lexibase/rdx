import { Button } from '@lexibase/rdx/ui/components/button'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@lexibase/rdx/ui/components/code-block'
import { Home, HomeSection } from '@lexibase/rdx/ui/components/home'

const example = 'pnpm dev'
const primaryAction =
  'border border-rdx-selected/30 bg-rdx-selected/15 text-foreground hover:bg-rdx-selected/25'

export default function DocumentationPreview() {
  return (
    <Home
      title="Build with Atlas."
      description="Learn how to connect your project to Atlas, with examples that take you from setup to your first request."
      buttons={[
        { label: 'Explore the docs', href: '/docs', className: primaryAction },
      ]}
      previewTitle="Getting started"
      previewDescription="Install the client, configure your project, and make your first request."
    >
      <HomeSection
        aria-labelledby="atlas-example"
        className="border-t border-border"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2">
          <div>
            <h2
              id="atlas-example"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              See your changes live.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Start the local documentation server and preview your changes as
              you write.
            </p>
          </div>
          <CodeBlock size="sm">
            <CodeBlockHeader>
              <CodeBlockTitle>Terminal</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={example} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent wrap>{example}</CodeBlockContent>
          </CodeBlock>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="atlas-quickstart"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <h2
            id="atlas-quickstart"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Make your first request.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Follow the documentation to configure the client and run your first
            example.
          </p>
          <Button
            href="/docs"
            variant="default"
            className={`mt-5 ${primaryAction}`}
          >
            Open the docs
          </Button>
        </div>
      </HomeSection>
    </Home>
  )
}
