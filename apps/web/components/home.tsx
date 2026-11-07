import { rehypeDocumentationCode } from '@lexibase/rdx-core/mdx'
import { Button } from '@lexibase/rdx-ui/components/button'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@lexibase/rdx-ui/components/code-block'
import { getMdxComponents } from '@lexibase/rdx-ui/components/mdx-components'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lexibase/rdx-ui/components/tabs'
import { ArrowRight } from 'lucide-react'
import { compileMDX } from 'next-mdx-remote/rsc'

import versions from '../versions.json'

import { HomeHero } from './home-hero'

const example = [
  '```ts title="project.ts" lineNumbers',
  "const project = 'My docs'",
  'console.log(`Welcome to ${project}!`)',
  '```',
].join('\n')

const installCommands = [
  ['pnpm', 'pnpm create @lexibase/rdx@latest'],
  ['npm', 'npm create @lexibase/rdx@latest'],
  ['Yarn', 'yarn dlx @lexibase/create-rdx@latest'],
] as const

export async function Home() {
  const { content } = await compileMDX({
    source: example,
    components: getMdxComponents('en'),
    options: {
      blockJS: true,
      blockDangerousJS: true,
      mdxOptions: { format: 'md', rehypePlugins: [rehypeDocumentationCode] },
    },
  })
  const edition = versions.active[0] ?? 'canary'

  return (
    <HomeHero>
      <section
        aria-labelledby="home-markdown-title"
        className="border-t border-border"
      >
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
          <h2
            id="home-markdown-title"
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            From Markdown to a documentation site.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Add a code fence to any page. RDX highlights the language and gives
            readers a copy button. Add a title and line numbers when they help.
          </p>
          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-medium">Write this</h3>
              <CodeBlock size="sm">
                <CodeBlockHeader>
                  <CodeBlockTitle>Markdown</CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton value={example} />
                  </CodeBlockActions>
                </CodeBlockHeader>
                <CodeBlockContent wrap>{example}</CodeBlockContent>
              </CodeBlock>
            </div>
            <div className="min-w-0">
              <h3 className="mb-3 text-sm font-medium">
                Your readers see this
              </h3>
              <div className="[&>[data-rdx-code-block]]:my-0">{content}</div>
            </div>
          </div>
          <Button
            href={`/docs/${edition}/code-blocks`}
            variant="link"
            className="mt-4 px-0"
          >
            Explore code blocks <ArrowRight />
          </Button>
        </div>
      </section>
      <section
        aria-labelledby="home-install-title"
        className="border-t border-border bg-muted/20"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-6 px-6 py-14 md:grid-cols-2 md:gap-10 md:px-10 md:py-20">
          <div>
            <h2
              id="home-install-title"
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              Start your docs.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
              Pick a package manager and run the command to create a
              documentation site with example pages you can edit.
            </p>
            <Button href={`/docs/${edition}/installation`} className="mt-5">
              Read the installation guide <ArrowRight />
            </Button>
          </div>
          <Tabs defaultValue="pnpm" className="my-0">
            <TabsList aria-label="Package manager">
              {installCommands.map(([name]) => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
            {installCommands.map(([name, command]) => (
              <TabsContent
                key={name}
                value={name}
                className="wrap-anywhere text-sm"
              >
                {command}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </HomeHero>
  )
}
