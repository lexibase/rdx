import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  moduleCache: false,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')
const { mdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)
const { Callout } = await jiti.import('../../rdx-ui/src/components/callout.tsx')
const { Blockquote } = await jiti.import(
  '../../rdx-ui/src/components/blockquote.tsx'
)

test('the complete shadcn Code Block API keeps composition, variants, wrapping and line numbering', () => {
  const {
    CodeBlock,
    CodeBlockHeader,
    CodeBlockTitle,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockContent,
    CodeBlockLine,
    CodeBlockFooter,
  } = mdxComponents
  const html = renderToStaticMarkup(
    createElement(
      CodeBlock,
      { variant: 'destructive', size: 'sm' },
      createElement(
        CodeBlockHeader,
        null,
        createElement(CodeBlockTitle, null, 'example.ts'),
        createElement(
          CodeBlockActions,
          null,
          createElement(CodeBlockCopyButton, { value: 'one\n\nthree' })
        )
      ),
      createElement(
        CodeBlockContent,
        { wrap: true, lineNumbers: true, startLine: 8 },
        'one\n\nthree'
      ),
      createElement(CodeBlockFooter, null, 'Example footer')
    )
  )
  for (const slot of [
    'code-block-header',
    'code-block-title',
    'code-block-actions',
    'code-block-copy-button',
    'code-block-content',
    'code-block-line-content',
    'code-block-footer',
  ])
    assert.ok(html.includes(`data-slot="${slot}"`), slot)
  assert.match(html, /data-variant="destructive"/)
  assert.match(html, /data-size="sm"/)
  assert.match(html, /data-wrap="true"/)
  assert.match(html, /data-numbered="true"/)
  assert.match(html, /counter-reset:line 7/)
  assert.equal((html.match(/data-slot="code-block-line"/g) ?? []).length, 3)
  for (const variant of ['added', 'removed', 'highlighted']) {
    const line = renderToStaticMarkup(
      createElement(CodeBlockLine, { variant }, 'value')
    )
    assert.ok(line.includes(`data-variant="${variant}"`))
  }
})

test('the official server highlighter exposes lazy language loading without client hooks', async () => {
  const { highlightCode } = await jiti.import(
    '../../rdx-ui/src/lib/highlighter.tsx'
  )
  const lines = await highlightCode('const ready = true', 'ts')
  assert.ok(lines?.length)
  assert.match(
    renderToStaticMarkup(createElement('code', null, lines)),
    /--shiki-light/
  )
  assert.equal(await highlightCode('plain', 'unknown-language'), null)
})

function renderedCodeText(html) {
  const body =
    html.match(/<pre\b[^>]*><code\b[^>]*>([\s\S]*?)<\/code><\/pre>/)?.[1] ?? ''
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
  }
  return body
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => entities[entity])
}

test('language fences use server-rendered dual-theme tokens while preserving exact code', async () => {
  for (const [language, code] of [
    ['ts', '  const text: string = "<tag> & RDX";\n\n\tconsole.log(text)\n'],
    ['tsx', 'export const Home = () => <main title="RDX">Hello</main>\n'],
    ['py', 'def hello(name):\n    return f"Hello {name}"\n'],
    ['json', '{ "framework": "RDX", "ready": true }\n'],
    ['sql', 'SELECT name FROM docs WHERE active = true;\n'],
    ['css', '.docs { color: red; }\n'],
    ['bash', 'pnpm dev\n'],
    ['rust', 'fn main() { println!("RDX"); }\n'],
  ]) {
    const { content } = await compileDocumentation(
      `\`\`\`${language}\n${code}\`\`\``,
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.match(html, /class="[^"]*shiki/)
    assert.match(html, /--shiki-light:/)
    assert.match(html, /--shiki-dark:/)
    assert.match(html, new RegExp(`language-${language}`))
    assert.equal(renderedCodeText(html), code)
    assert.doesNotMatch(html, /<main title="RDX">/)
  }
})

test('unknown, text and unlabelled fences remain readable; inline code stays unchanged', async () => {
  for (const language of ['not-an-rdx-language', 'text', '']) {
    const code = '  <script>notExecutable()</script>\n\n\tplain text\n'
    const { content } = await compileDocumentation(
      `Inline \`const inline = true\`.\n\n\`\`\`${language}\n${code}\`\`\``,
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.equal(renderedCodeText(html), code)
    assert.match(html, />const inline = true<\/code>/)
    assert.doesNotMatch(html, /<script>/)
  }
})

test('fence titles reach the shadcn header across highlighted, plain, diff and folder blocks without entering copied code', async () => {
  for (const [language, code, expected] of [
    ['ts', 'const search = true\n', 'const search = true\n'],
    ['text', 'plain code\n', 'plain code\n'],
    ['unknown-rdx-language', 'plain code\n', 'plain code\n'],
    ['diff', '-old\n+new\n', 'old\nnew\n'],
    ['folder', 'root/\n  intro.mdx\n', 'root/\n└── intro.mdx\n'],
  ]) {
    const { content } = await compileDocumentation(
      '```' + language + ' title="Project example.ts"\n' + code + '```',
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.match(
      html,
      /data-slot="code-block-title"[^>]*title="Project example.ts"/
    )
    assert.match(html, /Project example.ts<\/div>/)
    const baseline = await compileDocumentation(
      '```' + language + '\n' + code + '```',
      mdxComponents
    )
    assert.equal(
      renderedCodeText(html),
      renderedCodeText(renderToStaticMarkup(baseline.content)),
      language
    )
    const copyValue = html.match(/data-rdx-code-value="([^"]*)"/)?.[1]
    assert.equal(copyValue, language === 'folder' ? expected : code, language)
    if (language === 'ts') assert.match(html, /--shiki-light:/)
  }
})

test('fence titles stay literal, support either quote style and ignore nested or incomplete attributes', async () => {
  const cases = [
    [`title='Say "Hello".tsx'`, 'Say &quot;Hello&quot;.tsx'],
    ["title='Project notes.txt'", 'Project notes.txt'],
    ['title=example.ts', 'example.ts'],
    ['caption="title=wrong.ts" title="right.ts"', 'right.ts'],
    [
      'title="<script>alert(1)</script> & file.ts"',
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; file.ts',
    ],
    ['title=""', 'ts'],
    ['title="   "', 'ts'],
    ['title="incomplete', 'ts'],
    ['caption="example title=wrong.ts"', 'ts'],
  ]
  for (const [meta, expected] of cases) {
    const { content } = await compileDocumentation(
      '```ts ' + meta + '\nconst search = true\n```',
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.ok(html.includes(`title="${expected}"`), meta)
    assert.doesNotMatch(html, /<script>/)
    assert.equal(renderedCodeText(html), 'const search = true\n')
  }
})

test('Markdown numbering uses the official line composition, respects starting values and preserves copied source', async () => {
  for (const language of [
    'ts',
    'text',
    'unknown-rdx-language',
    'diff',
    'folder',
  ]) {
    const code =
      language === 'folder'
        ? 'root/\n  index.mdx\n'
        : language === 'diff'
          ? '-old\n+new\n'
          : 'const first = true\n\nconst last = false\n'
    const { content } = await compileDocumentation(
      '```' +
        language +
        ' title="Example" lineNumbers startLine=20\n' +
        code +
        '```',
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.match(html, /data-numbered="true"/)
    assert.match(html, /counter-reset:line 19/)
    assert.equal(
      (html.match(/data-slot="code-block-line"/g) ?? []).length,
      language === 'folder' || language === 'diff' ? 2 : 3,
      language
    )
    assert.match(html, /title="Example"/)
    assert.equal(
      html.match(/data-rdx-code-value="([^"]*)"/)?.[1],
      language === 'folder' ? 'root/\n└── index.mdx\n' : code
    )
    if (language === 'ts') assert.match(html, /--shiki-light:/)
    if (language === 'diff') {
      assert.equal((html.match(/data-variant="added"/g) ?? []).length, 1)
      assert.equal((html.match(/data-variant="removed"/g) ?? []).length, 1)
    }
  }
})

test('numbering flags are literal, opt-in and independent from titles and quoted metadata', async () => {
  for (const [meta, numbered, counter] of [
    ['', false, 0],
    ['lineNumbers', true, 0],
    ['lineNumbers=true', true, 0],
    ['lineNumbers="true" startLine="8"', true, 7],
    ['startLine=20', true, 19],
    ['startLine=20 lineNumbers=false', false, 19],
    ['lineNumbers=false startLine=20', false, 19],
    ['title="lineNumbers startLine=200"', false, 0],
    ['caption="lineNumbers startLine=200" title="Example"', false, 0],
  ]) {
    const { content } = await compileDocumentation(
      '```ts ' + meta + '\nconst ready = true\n```',
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.equal(html.includes('data-numbered="true"'), numbered, meta)
    assert.ok(html.includes('counter-reset:line ' + counter), meta)
  }
  for (const meta of [
    'startLine',
    'startLine=0',
    'startLine=-1',
    'startLine=1.5',
    'startLine=Infinity',
    'startLine=1e2',
    'startLine=9007199254740992',
    'lineNumbers=maybe',
  ])
    await assert.rejects(
      compileDocumentation(
        '```ts ' + meta + '\nconst ready = true\n```',
        mdxComponents
      ),
      /Invalid code fence metadata: (startLine|lineNumbers) must be/
    )
})

test('diff fences distinguish patch content from headers and preserve the exact copyable patch', async () => {
  const patch =
    'diff --git a/app.ts b/app.ts\n--- a/app.ts\n+++ b/app.ts\n@@ -1,2 +1,3 @@\n-const enabled = false\n+const enabled = true\n+const label = "<script> & RDX"\n console.log(enabled)\n'
  const { content } = await compileDocumentation(
    '```diff\n' + patch + '```',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-rdx-code-mode="diff"/)
  assert.equal((html.match(/data-variant="added"/g) ?? []).length, 2)
  assert.equal((html.match(/data-variant="removed"/g) ?? []).length, 1)
  assert.equal((html.match(/data-variant="highlighted"/g) ?? []).length, 1)
  const copyValue = html.match(/data-rdx-code-value="([^"]*)"/)?.[1]
  assert.ok(copyValue)
  assert.equal(
    copyValue.replace(
      /&(?:amp|lt|gt|quot|#x27);/g,
      (entity) =>
        ({
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#x27;': "'",
        })[entity]
    ),
    patch
  )
  assert.match(renderedCodeText(html), /const enabled = true/)
  assert.doesNotMatch(html, /<script>/)
})

test('folder fences draw nested branches and escaped filenames without changing plain text fences', async () => {
  const source =
    'my-docs/\n  docs/\n    guides/\n      intro.mdx\n    <example>.mdx\n  public/\n  rdx.config.ts\n'
  const diagram =
    'my-docs/\n├── docs/\n│   ├── guides/\n│   │   └── intro.mdx\n│   └── <example>.mdx\n├── public/\n└── rdx.config.ts\n'
  for (const language of ['folder', 'FOLDER']) {
    const { content } = await compileDocumentation(
      '```' + language + '\n' + source + '```',
      mdxComponents
    )
    const html = renderToStaticMarkup(content)
    assert.match(html, /data-rdx-code-mode="folder"/)
    assert.equal(renderedCodeText(html), diagram)
    assert.doesNotMatch(html, /<example>/)
    assert.match(html, /dir="ltr"/)
  }
  const { content } = await compileDocumentation(
    '```text\n' + source + '```',
    mdxComponents
  )
  assert.equal(renderedCodeText(renderToStaticMarkup(content)), source)
  for (const invalid of [
    'root/\n   bad.txt\n',
    'root/\n    skipped.txt\n',
    'root.txt\n  child.txt\n',
  ])
    await assert.rejects(
      compileDocumentation('```folder\n' + invalid + '```', mdxComponents),
      /Invalid folder fence at line 2/
    )
})

test('all starter documents compile with their real filesystem link context', async () => {
  const { getDocsIndex, getDocument } = await jiti.import(
    '../../rdx-core/src/index.ts'
  )
  const sourceRoot = fileURLToPath(
    new URL('../../create-rdx/templates/default/docs/', import.meta.url)
  )
  const documents = getDocsIndex({ docsDir: sourceRoot }).flatMap(
    (category) => category.pages
  )
  for (const page of documents) {
    const document = getDocument(page.slug, { docsDir: sourceRoot })
    const { content } = await compileDocumentation(
      document.content,
      mdxComponents,
      { sourceRoot, sourcePath: document.sourcePath, documents }
    )
    assert.ok(renderToStaticMarkup(content))
  }
})

test('MDX links, references and literal anchors resolve without rewriting images or code samples', async () => {
  const sourceRoot = path.resolve('fixtures/document-links')
  const links = {
    sourceRoot,
    sourcePath: path.join(sourceRoot, 'guides/intro.mdx'),
    routePrefix: '1.0.0',
    documents: [
      {
        sourcePath: path.join(sourceRoot, 'guides/install.mdx'),
        slug: 'guides/install',
      },
    ],
  }
  const { content } = await compileDocumentation(
    `## Setup

## Setup

[Install](./install.mdx?lang=pt#setup)

[Reference][install]

[install]: ./install.mdx#setup "A guide"

<Callout title="Tip">

[Read the guide](./install.mdx)

</Callout>

<a href="./install.mdx">Literal link</a>

![Image](./missing.mdx)

![Reference image][image]

[image]: ./missing-image.mdx

\`\`\`md
[Example](./missing.mdx)
\`\`\`

[External](https://example.com/guide.mdx)

[Anchor](#setup)
`,
    mdxComponents,
    links
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /href="\/docs\/1\.0\.0\/guides\/install\?lang=pt#setup"/)
  assert.match(
    html,
    /href="\/docs\/1\.0\.0\/guides\/install#setup" title="A guide"/
  )
  assert.equal(
    (html.match(/href="\/docs\/1\.0\.0\/guides\/install"/g) ?? []).length,
    2
  )
  assert.match(html, /src="\.\/missing\.mdx"/)
  assert.match(html, /src="\.\/missing-image\.mdx"/)
  assert.match(html.replace(/<[^>]*>/g, ''), /\[Example\]\(\.\/missing\.mdx\)/)
  assert.match(html, /href="https:\/\/example.com\/guide.mdx"/)
  assert.match(html, /href="#setup"/)
  assert.match(html, /id="setup"/)
  assert.match(html, /id="setup-1"/)
  await assert.rejects(
    () => compileDocumentation('[Broken](./missing.mdx)', mdxComponents, links),
    /Invalid document link.*missing\.mdx/
  )
})

test('MDX accordion accepts literal attributes and starts closed with native heading buttons', async () => {
  const { content } = await compileDocumentation(
    `<Accordion multiple>
<AccordionItem value="guide">
<AccordionTrigger>Read the guide</AccordionTrigger>
<AccordionContent>

**Optional explanation**

</AccordionContent>
</AccordionItem>
<AccordionItem value="disabled" disabled>
<AccordionTrigger>Not ready</AccordionTrigger>
<AccordionContent>Unavailable.</AccordionContent>
</AccordionItem>
</Accordion>`,
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-slot="accordion"/)
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 2)
  assert.match(html, /<h3\b[^>]*><button\b/)
  assert.match(html, /disabled=""/)
  assert.doesNotMatch(html, /Optional explanation|Unavailable\./)
})

test('React accordion preserves initial expansion, mounted panels, state classes and native props', async () => {
  const { Accordion, AccordionItem, AccordionTrigger, AccordionContent } =
    await jiti.import('../../rdx-ui/src/components/accordion.tsx')
  const html = renderToStaticMarkup(
    createElement(
      Accordion,
      {
        defaultValue: ['guide'],
        id: 'custom-accordion',
        className: () => 'my-2',
      },
      createElement(
        AccordionItem,
        { value: 'guide' },
        createElement(
          AccordionTrigger,
          { className: (state) => (state.open ? 'text-blue-600' : undefined) },
          'Guide'
        ),
        createElement(
          AccordionContent,
          null,
          createElement(Callout, { title: 'Tip' }, 'Rich content')
        )
      ),
      createElement(
        AccordionItem,
        { value: 'other' },
        createElement(AccordionTrigger, null, 'Other'),
        createElement(
          AccordionContent,
          { keepMounted: true },
          'Preserved answer'
        )
      )
    )
  )
  assert.match(html, /id="custom-accordion"/)
  assert.match(html, /my-2/)
  assert.doesNotMatch(html, /my-4/)
  assert.match(html, /text-blue-600/)
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /role="region"/)
  assert.match(html, /Rich content/)
  assert.match(html, /Preserved answer/)
  assert.match(html, /hidden=""/)
})

test('MDX tabs render the explicit default panel with rich content and no author JavaScript', async () => {
  const { content } = await compileDocumentation(
    `<Tabs defaultValue="pnpm">
<TabsList aria-label="Package manager">
<TabsTrigger value="npm">npm</TabsTrigger>
<TabsTrigger value="pnpm">pnpm</TabsTrigger>
</TabsList>
<TabsContent value="npm">

Inactive npm panel.

</TabsContent>
<TabsContent value="pnpm">

**Selected panel**

\`\`\`bash
pnpm install
\`\`\`

<Callout title="Tip">Shared components work here.</Callout>

</TabsContent>
</Tabs>`,
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /role="tablist"/)
  assert.match(html, /aria-label="Package manager"/)
  assert.equal((html.match(/role="tab"/g) ?? []).length, 2)
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 1)
  assert.match(html, /aria-selected="true"/)
  assert.match(html, /<strong>Selected panel<\/strong>/)
  assert.match(html.replace(/<[^>]*>/g, ''), /pnpm install/)
  assert.match(html, /data-rdx-code-block/)
  assert.match(html, /Shared components work here/)
  assert.doesNotMatch(html, /Inactive npm panel/)
})

test('React tabs preserve Base UI state classes, native props and opt-in mounted panels', async () => {
  const { Tabs, TabsList, TabsTrigger, TabsContent } = await jiti.import(
    '../../rdx-ui/src/components/tabs.tsx'
  )
  const html = renderToStaticMarkup(
    createElement(
      Tabs,
      { defaultValue: 'first', className: () => 'my-2', id: 'custom-tabs' },
      createElement(
        TabsList,
        { 'aria-label': 'Examples' },
        createElement(
          TabsTrigger,
          {
            value: 'first',
            className: (state) => (state.active ? 'text-blue-600' : undefined),
          },
          'First'
        ),
        createElement(
          TabsTrigger,
          { value: 'second', disabled: true },
          'Second'
        )
      ),
      createElement(TabsContent, { value: 'first' }, 'Selected content'),
      createElement(
        TabsContent,
        { value: 'second', keepMounted: true },
        'Preserved content'
      )
    )
  )
  assert.match(html, /id="custom-tabs"/)
  assert.match(html, /my-2/)
  assert.doesNotMatch(html, /my-6/)
  assert.match(html, /text-blue-600/)
  assert.match(html, /aria-disabled="true"/)
  assert.equal((html.match(/role="tabpanel"/g) ?? []).length, 2)
  assert.match(html, /hidden=""/)
  assert.match(html, /Preserved content/)
})

test('tables keep native structure, column alignment and rich content with the default shadcn style', async () => {
  const { content } = await compileDocumentation(
    '| Feature | Status | Count |\n| :--- | :---: | ---: |\n| **Markdown** | Ready | 1 |\n| [Guide](/docs/init/intro) | `code` | 2 |',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /data-slot="mdx-table-scroll"/)
  assert.doesNotMatch(html, /border-separate|nth-child\(even\)|border-r/)
  assert.match(html, /hover:bg-muted\/50/)
  assert.match(html, /<thead\b[^>]*data-slot="table-header"/)
  assert.match(html, /<tbody\b[^>]*data-slot="table-body"/)
  assert.match(html, /data-slot="table"/)
  assert.match(html, /data-slot="table-row"/)
  assert.match(html, /data-slot="table-cell"/)
  assert.equal((html.match(/scope="col"/g) ?? []).length, 3)
  for (const alignment of ['left', 'center', 'right'])
    assert.match(html, new RegExp(`text-align:${alignment}`))
  assert.match(html, /<strong>Markdown<\/strong>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, />code<\/code>/)
})

test('keyboard shortcuts use shadcn Kbd and KbdGroup in inline Markdown and table cells', async () => {
  const { content } = await compileDocumentation(
    `
Press <Kbd>Esc</Kbd> to close.

<KbdGroup aria-label="Control plus K"><Kbd>Ctrl</Kbd><span>+</span><Kbd>K</Kbd></KbdGroup>

| Action | Shortcut |
| --- | --- |
| Search | <KbdGroup><Kbd>Ctrl</Kbd>+<Kbd>K</Kbd></KbdGroup> |

Native markup: <kbd>Enter</kbd>.
`,
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.equal((html.match(/data-slot="kbd-group"/g) ?? []).length, 2)
  assert.match(html, /<kbd\b[^>]*data-slot="kbd"[^>]*>Esc<\/kbd>/)
  assert.match(html, /aria-label="Control plus K"/)
  assert.match(html, /h-5 w-fit min-w-5/)
  assert.match(html, /<td\b[^>]*>[\s\S]*data-slot="kbd-group"/)
  assert.match(html, /<kbd>Enter<\/kbd>/)
  assert.doesNotMatch(html, /role="button"|<kbd\b[^>]*tabindex=/)
})

test('shadcn Table composition preserves caption, footer, scroll accessibility and class overrides', async () => {
  const {
    Table,
    TableCaption,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
  } = await jiti.import('../../rdx-ui/src/components/table.tsx')
  const row = (Cell, text) =>
    createElement(TableRow, null, createElement(Cell, null, text))
  const html = renderToStaticMarkup(
    createElement(
      Table,
      {
        className: 'w-auto',
        containerProps: {
          role: 'region',
          'aria-label': 'Shortcuts',
          tabIndex: 0,
          className: 'rounded-lg',
        },
      },
      createElement(TableCaption, null, 'Keyboard shortcuts'),
      createElement(TableHeader, null, row(TableHead, 'Action')),
      createElement(TableBody, null, row(TableCell, 'Search')),
      createElement(TableFooter, null, row(TableCell, 'One shortcut'))
    )
  )
  for (const slot of [
    'table-container',
    'table',
    'table-caption',
    'table-header',
    'table-body',
    'table-footer',
    'table-row',
    'table-head',
    'table-cell',
  ])
    assert.ok(html.includes(`data-slot="${slot}"`), slot)
  assert.match(
    html,
    /role="region"[^>]*aria-label="Shortcuts"[^>]*tabindex="0"/
  )
  assert.match(html, /<caption\b[^>]*>Keyboard shortcuts<\/caption>/)
  assert.match(html, /<tfoot\b/)
  assert.equal((html.match(/<div\b/g) ?? []).length, 1)
  const tableClass = html.match(/<table\b[^>]*class="([^"]*)"/)?.[1]
  assert.ok(tableClass.includes('w-auto'))
  assert.ok(!tableClass.includes('w-full'))
})

test('blockquotes preserve Markdown, native citation semantics and class overrides', async () => {
  const { content } = await compileDocumentation(
    '> A **quotation** with [a link](/docs/init/intro) and `code`.\n>\n> Another paragraph.\n>\n> - A list item\n>\n> > A nested quotation.',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.equal((html.match(/<blockquote\b/g) ?? []).length, 2)
  assert.match(html, /data-rdx-blockquote/)
  assert.match(html, /<strong>quotation<\/strong>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, />code<\/code>/)
  assert.match(html, /Another paragraph/)
  assert.match(html, /<li\b/)
  assert.match(html, /A list item/)
  assert.doesNotMatch(
    html,
    /role="alert"|role="note"|aria-live=|data-rdx-callout/
  )
  const custom = renderToStaticMarkup(
    createElement(
      Blockquote,
      { cite: 'https://example.com/source', id: 'quote', className: 'my-2' },
      'Quoted text'
    )
  )
  assert.match(custom, /cite="https:\/\/example.com\/source"/)
  assert.match(custom, /id="quote"/)
  assert.match(custom, /my-2/)
  assert.doesNotMatch(custom, /my-6/)
  assert.match(custom, /aria-hidden="true"/)
})
const { VersionBanner } = await jiti.import(
  '../../../apps/web/components/Page/version-banner.tsx'
)

test('version notices share Callout styling and preserve current-version navigation', () => {
  const currentVersion = '2.1.1'
  for (const [version, kind, message] of [
    ['canary', 'canary', 'This is a pre-release version of the documentation.'],
    ['2.1.0', 'outdated', 'This is an outdated version of the documentation.'],
    ['2.0.0', 'outdated', 'This is an outdated version of the documentation.'],
  ]) {
    const html = renderToStaticMarkup(
      createElement(VersionBanner, { version, currentVersion })
    )
    assert.ok(html.includes(message))
    assert.match(html, new RegExp(`data-rdx-version-notice="${kind}"`))
    assert.match(html, /role="note"/)
    assert.match(html, /href="\/docs\/2.1.1"/)
    assert.match(html, /Go back to the current version/)
    assert.doesNotMatch(html, /role="alert"|aria-live=|currento|undefined/)
  }
  assert.equal(
    renderToStaticMarkup(
      createElement(VersionBanner, { version: '2.1.1', currentVersion })
    ),
    ''
  )
  assert.equal(
    renderToStaticMarkup(
      createElement(VersionBanner, {
        version: 'canary',
        currentVersion: undefined,
      })
    ),
    ''
  )
})

test('shared MDX renders GFM, headings, code, images and Callout without imports', async () => {
  const { content } = await compileDocumentation(
    `#### Details

##### More details

###### Small heading

| Feature | Status |
| :------ | -----: |
| Callout | Ready |

- [x] Done
- [ ] Pending

~~Removed~~

---

![Example](/images/example.svg)

<Callout variant="warning" title="Before updating">

Read **release notes** and [the guide](/docs/init/intro).

- Keep your files.
- Test first.

</Callout>

\`\`\`ts
const framework = 'RDX'
\`\`\`
`,
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /<h4\b[^>]*>Details<\/h4>/)
  assert.match(html, /<h5\b/)
  assert.match(html, /<h6\b/)
  assert.match(html, /data-slot="mdx-table-scroll"/)
  assert.match(html, /<th\b[^>]*scope="col"/)
  assert.match(html, /text-align:right/)
  assert.match(html, /<td\b[^>]*>Ready<\/td>/)
  assert.match(html, /type="checkbox"[^>]*disabled=""[^>]*checked=""/)
  assert.match(html, /<del>Removed<\/del>/)
  assert.match(html, /<hr\b/)
  assert.match(html, /<img\b[^>]*alt="Example"[^>]*max-w-full/)
  assert.match(
    html,
    /role="note"[^>]*aria-label="Before updating"[^>]*data-rdx-callout="warning"/
  )
  assert.match(html, /<strong>release notes<\/strong>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, /<pre\b[^>]*tabindex="0"/)
  assert.match(html, /class="[^"]*language-ts/)
  assert.doesNotMatch(html, /role="alert"/)
  assert.match(html, /data-rdx-code-block/)
  assert.match(html, /aria-label="Copy code"/)
})

test('Callout supports all variants, optional titles, safe defaults and class overrides', () => {
  for (const variant of ['note', 'tip', 'success', 'warning', 'danger']) {
    const html = renderToStaticMarkup(
      createElement(
        Callout,
        { variant, title: 'Title', className: 'my-2', id: variant },
        'Body'
      )
    )
    assert.match(html, new RegExp(`data-rdx-callout="${variant}"`))
    assert.match(html, /aria-hidden="true"/)
    assert.match(html, /my-2/)
    assert.doesNotMatch(html, /my-6/)
    assert.match(html, /Body/)
    assert.doesNotMatch(html, /aria-live=/)
  }
  const html = renderToStaticMarkup(createElement(Callout, {}, 'Body'))
  assert.match(html, /aria-label="Note"/)
  assert.doesNotMatch(html, /data-slot="callout-title"/)
  for (const variant of ['unknown', '__proto__']) {
    assert.throws(
      () => renderToStaticMarkup(createElement(Callout, { variant }, 'Body')),
      /Invalid Callout variant/
    )
  }
  const heading = renderToStaticMarkup(
    createElement(
      mdxComponents.h2,
      { className: 'my-2', id: 'custom' },
      'Custom'
    )
  )
  assert.match(heading, /text-2xl font-bold my-2/)
  assert.doesNotMatch(heading, /my-6/)
})

test('code blocks preserve text and language while inline code has no copy button', async () => {
  const { content } = await compileDocumentation(
    'Use `inline` code.\n\n```ts\n  const text = "<tag> & RDX"\n\tconsole.log(text)\n```\n\n```\nplain text\n```',
    mdxComponents
  )
  const html = renderToStaticMarkup(content)
  assert.equal((html.match(/data-rdx-code-block/g) ?? []).length, 2)
  assert.equal((html.match(/aria-label="Copy code"/g) ?? []).length, 2)
  assert.equal((html.match(/aria-label="Wrap lines"/g) ?? []).length, 2)
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 2)
  for (const button of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) {
    assert.match(button[1], /<svg\b/)
    assert.equal(button[1].replace(/<[^>]*>/g, '').trim(), '')
  }
  assert.match(html, /language-ts/)
  assert.match(
    html.replace(/<[^>]*>/g, ''),
    / {2}const text = &quot;&lt;tag&gt; &amp; RDX&quot;\n\tconsole.log\(text\)\n/
  )
  assert.match(html, / Code<\/div>/)
  assert.match(html, />inline<\/code>/)
})

test('MDX keeps Markdown, links, images, fenced code and registered JSX components usable', async () => {
  const { content } = await compileDocumentation(
    '# Documentation\n\n[Guide](/docs/init/intro)\n\n![Logo](/images/rdx.svg)\n\n<Notice title="Note">Custom component</Notice>\n\n```js\nconst value = { example: true }\n```',
    {
      Notice: () =>
        createElement('aside', { title: 'Note' }, 'Custom component'),
    }
  )
  const html = renderToStaticMarkup(content)
  assert.match(html, /<h1 id="documentation">Documentation<\/h1>/)
  assert.match(html, /href="\/docs\/init\/intro"/)
  assert.match(html, /src="\/images\/rdx.svg"/)
  assert.match(html, /<aside title="Note">Custom component<\/aside>/)
  assert.match(renderedCodeText(html), /const value = \{ example: true \}/)
})

test('MDX expressions and JSX expression attributes cannot execute project-server JavaScript', async () => {
  globalThis.__rdxMdxSecurityProbe = 'untouched'
  try {
    const { content } = await compileDocumentation(
      '# Safe\n\n{(() => { globalThis.__rdxMdxSecurityProbe = "executed"; return "MDX_EXECUTED" })()}\n\n<span title={(globalThis.__rdxMdxSecurityProbe = "executed")}>Static content</span>',
      {}
    )
    const html = renderToStaticMarkup(content)
    assert.equal(globalThis.__rdxMdxSecurityProbe, 'untouched')
    assert.match(html, /Static content/)
    assert.doesNotMatch(html, /MDX_EXECUTED|title="executed"/)
  } finally {
    delete globalThis.__rdxMdxSecurityProbe
  }
})

test('Button navigation keeps native anchor semantics and the link variant', async () => {
  const { Button } = await jiti.import('../../rdx-ui/src/components/button.tsx')
  const html = renderToStaticMarkup(
    createElement(
      Button,
      {
        href: '/docs',
        variant: 'link',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': 'Read documentation',
      },
      'Documentation'
    )
  )
  assert.match(html, /<a\b/)
  assert.match(html, /href="\/docs"/)
  assert.match(html, /hover:underline/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /aria-label="Read documentation"/)
  assert.doesNotMatch(html, /role="button"|type="button"/)
  const action = renderToStaticMarkup(
    createElement(Button, { disabled: true }, 'Save')
  )
  assert.match(action, /<button\b/)
  assert.match(action, /disabled=""/)
})
