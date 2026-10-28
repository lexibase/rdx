'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Paintbrush } from 'lucide-react'
import { Button } from '@lexibase/rdx-ui/components/button'
import { Callout } from '@lexibase/rdx-ui/components/callout'
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@lexibase/rdx-ui/components/code-block'
import { Logo } from '@lexibase/rdx-ui/components/logo'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lexibase/rdx-ui/components/tabs'

const palettes = [
  { name: 'Default', light: '', dark: '', swatch: '#a3a3a3' },
  { name: 'Blue', light: '#2563eb', dark: '#60a5fa', swatch: '#60a5fa' },
  { name: 'Violet', light: '#7c3aed', dark: '#a78bfa', swatch: '#a78bfa' },
  { name: 'Green', light: '#15803d', dark: '#4ade80', swatch: '#4ade80' },
] as const

/** The official site's homepage; generated projects keep their own homepage. */
export function Home() {
  const [selected, setSelected] = useState(0)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const palette = palettes[selected]!
  const css = palette.light
    ? `:root {\n  --rdx-highlighting: ${palette.light};\n}\n\n.dark {\n  --rdx-highlighting: ${palette.dark};\n}`
    : '/* RDX uses its default highlights without an override. */'

  return (
    <main
      data-rdx-home
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
    >
      <section
        aria-labelledby="home-title"
        className="rdx-home-stage mx-auto grid w-full max-w-[1440px] content-center items-center gap-8 px-6 py-10 md:px-10 md:py-20 lg:min-h-[calc(100svh-3rem)] lg:grid-cols-[0.8fr_1.2fr] lg:gap-x-12 lg:gap-y-5"
      >
        <div className="rdx-home-copy min-w-0">
          <p className="mb-6 hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <Logo className="size-6" />
            Next.js + Tailwind CSS + shadcn/ui
          </p>
          <h1
            id="home-title"
            className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-6xl lg:leading-none"
          >
            Your words.
            <br />
            Your docs.
            <br />
            Your colors.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground lg:mt-6 lg:text-base lg:leading-7">
            Turn folders and Markdown into documentation. Start writing, choose
            your highlights, and make it yours.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 lg:mt-7">
            <Button href="/docs" variant="default">
              Explore the docs <ArrowRight />
            </Button>
            <Button href="https://github.com/lexibase/rdx" variant="outline">
              GitHub
            </Button>
          </div>

          <fieldset className="mt-6 lg:mt-10">
            <legend className="mb-2 flex items-center gap-2 text-sm font-medium lg:mb-3">
              <Paintbrush className="size-4" aria-hidden="true" /> Try a
              highlight
            </legend>
            <div className="flex flex-wrap gap-2">
              {palettes.map((option, index) => (
                <Button
                  key={option.name}
                  variant="outline"
                  size="sm"
                  aria-pressed={index === selected}
                  aria-controls="highlight-preview"
                  onClick={() => setSelected(index)}
                >
                  <span
                    className="flex size-3.5 items-center justify-center rounded-full"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {index === selected && (
                      <Check
                        className="size-2.5 text-black"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  {option.name}
                </Button>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Only the preview changes. Copy a color pair into your rdx.css.
          </p>
        </div>

        <div
          className="rdx-home-preview-shell min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          inert={compact}
          aria-hidden={compact || undefined}
        >
          <div
            id="highlight-preview"
            data-palette={palette.name}
            className="rdx-home-preview overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-2xl shadow-black/10"
            style={
              {
                '--preview-light': palette.light || 'initial',
                '--preview-dark': palette.dark || 'initial',
              } as CSSProperties
            }
          >
            <div className="flex h-10 items-center gap-1.5 border-b border-border bg-muted/30 px-4">
              <span className="size-2 rounded-full bg-muted-foreground/30" />
              <span className="size-2 rounded-full bg-muted-foreground/30" />
              <span className="size-2 rounded-full bg-muted-foreground/30" />
              <span className="mx-auto pr-8 text-[10px] text-muted-foreground">
                your-docs / getting-started
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Logo className="size-5" /> Your docs
              </div>
              <span className="text-xs text-muted-foreground">
                Documentation
              </span>
            </div>
            <div className="flex min-h-[430px]">
              <aside
                aria-label="Preview navigation"
                className="rdx-home-preview-sidebar hidden w-36 shrink-0 border-r border-border p-3 sm:block"
              >
                <p className="mb-3 mt-2 text-[10px] uppercase text-muted-foreground">
                  Getting started
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  active
                  className="mb-1 w-full justify-start text-accent-foreground"
                  onClick={() =>
                    document.getElementById('preview-introduction')?.focus()
                  }
                >
                  Introduction
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  href="/docs/canary/installation"
                  className="w-full justify-start text-xs"
                >
                  Installation
                </Button>
                <p className="mb-3 mt-7 text-[10px] uppercase text-muted-foreground">
                  Make it yours
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  href="/docs/canary/appearance"
                  className="w-full justify-start text-xs"
                >
                  Appearance
                </Button>
              </aside>
              <article className="min-w-0 flex-1 px-5 py-7 sm:px-7">
                <p className="text-[10px] uppercase text-muted-foreground">
                  Getting started
                </p>
                <h2
                  id="preview-introduction"
                  tabIndex={-1}
                  className="mt-2 text-2xl font-semibold tracking-tight outline-none"
                >
                  A place for your ideas.
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Write Markdown. Add a folder. Your next great documentation
                  starts here.
                </p>
                <Link
                  href="/docs/canary/appearance"
                  className="mt-4 inline-flex text-sm text-rdx-highlighting underline underline-offset-4"
                >
                  Make it feel like you <ArrowRight className="ml-1 size-4" />
                </Link>
                <Tabs defaultValue="pnpm" className="mt-6">
                  <TabsList>
                    <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                    <TabsTrigger value="npm">npm</TabsTrigger>
                    <TabsTrigger value="yarn">yarn</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pnpm" className="text-xs break-all">
                    pnpm create @lexibase/rdx@latest
                  </TabsContent>
                  <TabsContent value="npm" className="text-xs break-all">
                    npm create @lexibase/rdx@latest
                  </TabsContent>
                  <TabsContent value="yarn" className="text-xs break-all">
                    yarn dlx @lexibase/create-rdx@latest
                  </TabsContent>
                </Tabs>
                <Callout
                  variant="tip"
                  title="Keep it simple"
                  className="mb-0 p-3"
                >
                  Your content stays in docs/. RDX handles the rest.
                </Callout>
              </article>
            </div>
          </div>
          <p
            role="status"
            className="mt-4 text-center text-xs text-muted-foreground"
          >
            {palette.name} highlights · Live RDX components
          </p>
        </div>
        <div className="rdx-home-css min-w-0 lg:col-start-1 lg:row-start-2">
          <div className="max-w-md">
            <CodeBlock size="sm">
              <CodeBlockHeader>
                <CodeBlockTitle>rdx.css</CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton value={css} />
                </CodeBlockActions>
              </CodeBlockHeader>
              <CodeBlockContent className="h-40" wrap>
                {css}
              </CodeBlockContent>
            </CodeBlock>
          </div>
          <Button
            href="/docs/canary/appearance"
            variant="link"
            className="mt-2 px-0 text-xs"
          >
            Customize your highlights <ArrowRight />
          </Button>
        </div>
      </section>
    </main>
  )
}
