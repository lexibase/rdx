import { Fragment } from 'react'
import { Button } from '@lexibase/rdx/ui/components/button'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@lexibase/rdx/ui/components/code-block'
import { HomeSection, HomeSections } from '@lexibase/rdx/ui/components/home'
import { highlightCode } from '@lexibase/rdx/ui/lib/highlighter'

const example = [
  "import { createServer } from 'node:http'",
  '',
  'const server = createServer((request, response) => {',
  "  response.end('Hello from Atlas!')",
  '})',
  '',
  'server.listen(3000)',
].join('\n')

export default async function CodeInFocus() {
  const lines = await highlightCode(example, 'typescript')

  return (
    <HomeSections>
      <HomeSection aria-labelledby="code-hero-title">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
          <div className="min-w-0">
            <h1
              id="code-hero-title"
              className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Your first API, in minutes.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
              Start with a minimal TypeScript server and make it your own.
            </p>
            <Button href="/docs" variant="default" className="mt-6">
              Get started
            </Button>
          </div>
          <CodeBlock className="min-w-0">
            <CodeBlockHeader>
              <CodeBlockTitle>server.ts</CodeBlockTitle>
              <CodeBlockActions>
                <CodeBlockCopyButton value={example} />
              </CodeBlockActions>
            </CodeBlockHeader>
            <CodeBlockContent wrap>
              <code>
                {lines?.map((line, index) => (
                  <Fragment key={index}>
                    {index > 0 && '\n'}
                    {line}
                  </Fragment>
                )) ?? example}
              </code>
            </CodeBlockContent>
          </CodeBlock>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="code-quickstart-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <h2
            id="code-quickstart-title"
            className="text-3xl font-semibold tracking-tight"
          >
            Run it locally.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Save the example as <code>server.ts</code>, run{' '}
            <code>node server.ts</code>, and open <code>localhost:3000</code>.
          </p>
        </div>
      </HomeSection>
    </HomeSections>
  )
}
