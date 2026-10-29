import assert from 'node:assert/strict'
import test from 'node:test'
import { createJiti } from 'jiti'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const jiti = createJiti(import.meta.url, {
  moduleCache: true,
  fsCache: false,
  jsx: { runtime: 'automatic' },
})
const { compileDocumentation } = await jiti.import('../src/runtime/mdx.ts')
const { mdxComponents, getMdxComponents } = await jiti.import(
  '../../rdx-ui/src/components/mdx-components.tsx'
)
const { LocaleProvider } = await jiti.import(
  '../../rdx-ui/src/providers/locale-provider.tsx'
)
async function render(source, links) {
  const { content } = await compileDocumentation(source, mdxComponents, links)
  return renderToStaticMarkup(content)
}

test('five Markdown callouts preserve rich bodies and optional titles', async () => {
  for (const variant of ['NOTE', 'TIP', 'SUCCESS', 'WARNING', 'DANGER']) {
    const html = await render(
      `> [!${variant}] A **useful** title\n> Body with **Markdown** and :kbd[Enter].\n>\n> - First\n> - Second`
    )
    assert.ok(html.includes(`data-rdx-callout="${variant.toLowerCase()}"`))
    assert.match(html, /A useful title/)
    assert.match(html, /<strong>Markdown<\/strong>/)
    assert.match(html, /<kbd[^>]*>Enter<\/kbd>/)
    assert.match(html, /<li[^>]*>First<\/li>/)
    assert.doesNotMatch(html, /\[!(NOTE|TIP|SUCCESS|WARNING|DANGER)\]/)
  }
  const untitled = await render('> [!NOTE]\n> Content')
  assert.match(untitled, /data-rdx-callout="note"/)
  assert.doesNotMatch(untitled, /data-slot="callout-title"/)
})

test('ordinary quotes, escaped markers and code stay literal', async () => {
  for (const source of [
    '> [!INFO]\n> Ordinary quote',
    '> \\[!NOTE]\n> Escaped',
    '> Before [!NOTE]',
    '> `[!NOTE]`\n> Code',
  ]) {
    assert.doesNotMatch(await render(source), /data-rdx-callout/)
  }
  const html = await render(
    '```md\n> [!NOTE]\n:::tabs\n### pnpm\n:kbd[Ctrl]\n::: \n```'
  )
  assert.doesNotMatch(html, /data-rdx-callout|data-slot="tabs"|<kbd/)
})

test('Markdown tabs and accordions render the shared Base UI components', async () => {
  const html = await render(
    '## Examples\n\n:::tabs\n\n### pnpm\n\n```sh\npnpm dev\n```\n\n### npm\n\n#### Detail\n\nnpm run dev\n\n:::\n\n:::accordion\n\n### First question\n\nAnswer with **Markdown**.\n\n### Second question\n\nOther answer.\n\n:::'
  )
  assert.match(html, /role="tablist"/)
  assert.match(html, /aria-label="Documentation tabs"/)
  assert.match(html, /role="tab"[^>]*|data-slot="tabs-trigger"/)
  assert.match(html, /pnpm dev/)
  assert.match(html, /data-slot="accordion-trigger"/)
  assert.doesNotMatch(html, /id="(?:pnpm|npm|first-question|second-question)"/)
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 2)
})

test('keyboard directives work in prose and tables even beside link definitions', async () => {
  const html = await render(
    'Press :kbd[Ctrl] + :kbd[K].\n\n| Action | Key |\n| --- | --- |\n| Close | :kbd[Esc] |\n\n[Ctrl]: https://example.com'
  )
  assert.equal((html.match(/<kbd/g) ?? []).length, 3)
  assert.doesNotMatch(html, /href="https:\/\/example.com"/)
  assert.match(
    await render('Unknown :widget[Text] stays literal.'),
    /:widget\[Text\]/
  )
  assert.doesNotMatch(await render('`:kbd[Ctrl]` and \\:kbd[Esc]'), /<kbd/)
})

test('complete keyboard shortcuts expose one localized text alternative and preserve shadcn composition', async () => {
  for (const [lang, expected] of [
    ['en', 'Control plus K'],
    ['pt-BR', 'Control mais K'],
    ['fr-FR', 'Control plus K'],
  ]) {
    const { content } = await compileDocumentation(
      'Press :kbd[Ctrl + K].',
      getMdxComponents(lang)
    )
    const html = renderToStaticMarkup(content)
    assert.ok(
      html.includes(`<span class="sr-only select-none">${expected}</span>`)
    )
    assert.match(html, /data-rdx-kbd-value="Ctrl \+ K"/)
    assert.match(html, /<kbd[^>]*data-slot="kbd-group"[^>]*aria-hidden="true"/)
    assert.equal((html.match(/data-slot="kbd"/g) ?? []).length, 2)
    assert.doesNotMatch(html, /aria-label=|tabindex=|role="button"/)
  }
})

test('explicitly named shadcn keyboard groups support accessible names without changing unnamed or custom-role compositions', () => {
  const group = (props) =>
    renderToStaticMarkup(
      createElement(
        mdxComponents.KbdGroup,
        props,
        createElement(mdxComponents.Kbd, null, 'Ctrl')
      )
    )
  assert.match(group({ 'aria-label': 'Control plus K' }), /role="group"/)
  assert.match(group({ 'aria-labelledby': 'shortcut-label' }), /role="group"/)
  assert.doesNotMatch(group({}), /role=/)
  assert.match(group({ role: 'img', 'aria-label': 'Shortcut' }), /role="img"/)
})

test('shortcut aliases, repeated keys and literal plus signs stay readable without interpreting arbitrary text', async () => {
  for (const [value, expected] of [
    ['⌘ + ⇧ + K', 'Command plus Shift plus K'],
    ['Ctrl + +', 'Control plus Plus'],
    ['Alt + Space', 'Alt plus Space'],
    ['Ctrl + ↑', 'Control plus Up arrow'],
    ['K + K', 'K plus K'],
    ['constructor + toString', 'constructor plus toString'],
  ]) {
    const html = await render(`:kbd[${value}]`)
    assert.ok(
      html.includes(`<span class="sr-only select-none">${expected}</span>`),
      value
    )
  }
  for (const key of ['+', 'C++', 'Ctrl+K', 'Enter']) {
    const html = await render(`:kbd[${key}]`)
    assert.doesNotMatch(html, /data-rdx-kbd-value/)
    assert.equal((html.match(/<kbd/g) ?? []).length, 1)
  }
})

test('generated tab lists follow the configured interface language', async () => {
  const { content } = await compileDocumentation(
    ':::tabs\n### First\nContent\n:::',
    mdxComponents
  )
  const html = renderToStaticMarkup(
    createElement(LocaleProvider, { lang: 'pt-BR' }, content)
  )
  assert.match(html, /aria-label="Abas da documentação"/)
})

test('literal disabled markers produce boolean disabled tabs and select the first enabled panel', async () => {
  const html = await render(
    ':::tabs\n\n### npm {disabled}\n\nUnavailable example.\n\n### pnpm\n\npnpm dev\n\n### yarn {disabled}\n\nyarn dev\n\n:::'
  )
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  const npm = buttons.find((match) => match[2] === 'npm')
  const pnpm = buttons.find((match) => match[2] === 'pnpm')
  const yarn = buttons.find((match) => match[2] === 'yarn')
  assert.match(npm[1], /disabled=""/)
  assert.match(yarn[1], /disabled=""/)
  assert.match(pnpm[1], /aria-selected="true"/)
  assert.match(html, /pnpm dev/)
  assert.doesNotMatch(html, /\{disabled\}|Unavailable example/)
  await assert.rejects(
    render(':::tabs\n### npm {disabled}\nContent\n:::'),
    /at least one enabled tab/
  )
  await assert.rejects(
    render(':::tabs\n### npm {disabled=true}\nContent\n:::'),
    /titles must contain text/
  )
  assert.match(
    await render(':::tabs\n### npm \\{disabled}\nContent\n:::'),
    /npm \{disabled\}/
  )
  assert.match(
    await render(':::tabs\n### npm `{disabled}`\nContent\n:::'),
    /npm \{disabled\}/
  )
})

test('invalid component syntax gives useful errors, and JavaScript stays blocked', async () => {
  for (const [source, message] of [
    [':::tabs\nText before a title\n:::', /Start :::tabs items with ###/],
    [':::accordion\n:::', /requires at least one/],
    [':::tabs\n###\nText\n:::', /nonempty ### title/],
    [':kbd[]', /requires a key/],
    [':kbd[Ctrl]{onclick=evil}', /does not accept attributes/],
    [':tabs[Title]', /:::tabs block/],
    [
      ':::tabs\n### {globalThis.__rdxMarkdownExecuted = true}\nText\n:::',
      /titles must contain text/,
    ],
  ])
    await assert.rejects(render(source), message)
  globalThis.__rdxMarkdownExecuted = false
  const safe = await render(
    ':::tabs\n### Safe\n\n{globalThis.__rdxMarkdownExecuted = true}\n\n:::'
  )
  assert.doesNotMatch(safe, /__rdxMarkdownExecuted/)
  assert.equal(globalThis.__rdxMarkdownExecuted, false)
  delete globalThis.__rdxMarkdownExecuted
})

test('nested directives keep each group and Markdown link content', async () => {
  const html = await render(
    '::::accordion\n\n### Commands\n\n:::tabs\n\n### pnpm\n\n[Guide](https://example.com)\n\n### npm\n\n> [!TIP]\n> Press :kbd[Enter].\n\n:::\n\n::::'
  )
  assert.match(html, /data-slot="accordion"/)
  // Closed accordion panels are mounted by the Base UI component on demand.
  assert.match(html, /Commands/)
})
