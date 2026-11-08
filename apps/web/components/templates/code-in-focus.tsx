import { Button } from '@lexibase/rdx/ui/components/button'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from '@lexibase/rdx/ui/components/code-block'
import { HomeSection, HomeSections } from '@lexibase/rdx/ui/components/home'
import { highlightCode } from '@lexibase/rdx/ui/lib/highlighter'

const example = [
  "import { createServer } from 'node:http'",
  '',
  'const server = createServer((request, response) => {',
  "  response.setHeader('Content-Type', 'application/json')",
  "  response.end(JSON.stringify({ message: 'Hello from Atlas!' }))",
  '})',
  '',
  'server.listen(3000)',
].join('\n')

const commands = [
  { title: 'Server', command: 'node server.ts' },
  { title: 'Request', command: 'curl http://localhost:3000/' },
]

const primaryAction =
  'border border-rdx-selected/30 bg-rdx-selected/15 text-foreground hover:bg-rdx-selected/25'

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
            <Button
              href="/docs"
              variant="default"
              className={`mt-6 ${primaryAction}`}
            >
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
              {lines?.map((line, index) => (
                <CodeBlockLine key={index} className="min-w-0 wrap-anywhere">
                  {line}
                </CodeBlockLine>
              )) ?? example}
            </CodeBlockContent>
          </CodeBlock>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="code-request-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-2 md:gap-12">
          <header>
            <h2
              id="code-request-title"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Follow the request.
            </h2>
            <p className="mt-3 max-w-sm leading-7 text-muted-foreground">
              The example uses Node&apos;s HTTP module. Here&apos;s what happens
              between opening the URL and getting a response.
            </p>
          </header>
          <dl className="divide-y divide-border border-y border-border">
            <div className="py-4">
              <dt className="font-medium">Accept a connection</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                <code>server.listen(3000)</code> opens a local port so your
                browser or terminal can reach the server.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-medium">Handle the request</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                The callback passed to <code>createServer</code> runs for every
                request. Add a check on <code>request.url</code> when you need
                different responses for different paths.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-medium">Return structured data</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                The content type tells clients to expect JSON. Edit the object
                passed to <code>JSON.stringify</code> to change what they
                receive.
              </dd>
            </div>
          </dl>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="code-quickstart-title"
        className="border-t border-border"
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <h2
              id="code-quickstart-title"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Run it locally.
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
              <li>
                Copy the example above into <code>server.ts</code>.
              </li>
              <li>Start the server with Node.js 22 or 24.</li>
              <li>
                Send a request in a second terminal or open the URL in your
                browser.
              </li>
            </ol>
          </div>
          <div className="min-w-0 space-y-3">
            {commands.map(({ title, command }) => (
              <CodeBlock key={title} size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle>{title}</CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={command} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent wrap>{command}</CodeBlockContent>
              </CodeBlock>
            ))}
            <p className="text-sm leading-6 text-muted-foreground">
              Expected response:{' '}
              <code className="break-all">
                {'{"message":"Hello from Atlas!"}'}
              </code>
            </p>
          </div>
        </div>
      </HomeSection>
      <HomeSection
        aria-labelledby="code-next-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto max-w-xl text-center">
          <h2
            id="code-next-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Make the example your own.
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Change the greeting, add a route of your own, or return data your
            frontend can use.
          </p>
          <Button
            href="/docs"
            variant="default"
            className={`mt-6 ${primaryAction}`}
          >
            Explore the docs
          </Button>
        </div>
      </HomeSection>
    </HomeSections>
  )
}
