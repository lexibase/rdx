import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { readHomepageTranslations } from '../bin/homepage-translations.mjs'

async function analyze(testContext, source, catalog) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-homepage-'))
  testContext.after(() => rm(rootDir, { recursive: true, force: true }))
  await mkdir(path.join(rootDir, 'components'))
  await mkdir(path.join(rootDir, 'locale/pt-br'), { recursive: true })
  await writeFile(path.join(rootDir, 'components/home.tsx'), source)
  await writeFile(
    path.join(rootDir, 'locale/pt-br/home.json'),
    JSON.stringify(catalog)
  )
  const warnings = testContext.mock.method(console, 'warn', () => {})
  const result = await readHomepageTranslations(
    {
      rootDir,
      localization: { locales: [{ folder: 'pt-br', path: 'pt-br' }] },
    },
    { report: true }
  )
  return {
    phrases: [...result.phrases],
    warnings: warnings.mock.calls.map(({ arguments: [message] }) => message),
  }
}

test('warns about dynamic homepage phrases and retains diagnostics for known phrases', async (t) => {
  const result = await analyze(
    t,
    `export default function Home({ t, label, condition }) {
  return [t(label), t(condition ? 'A' : 'B'), t('A' + label), t(\`Hi \${label}\`), t('Known')]
}`,
    { Dynamic: 'Dinâmico' }
  )
  assert.deepEqual(result.phrases, ['Known'])
  assert.equal(
    result.warnings.filter((message) =>
      message.includes('components/home.tsx:2: t() needs a literal phrase')
    ).length,
    4
  )
  assert.match(result.warnings.at(-1), /missing translation for "Known"/)
  assert.doesNotMatch(result.warnings.join('\n'), /orphaned/)
})

test('warns when the homepage translator is passed to JSX and helper calls', async (t) => {
  const result = await analyze(
    t,
    `export default function Home({ t, items }) {
  items.map(t)
  helper(t)
  return <Hero t={t} />
}`,
    { Nested: 'Aninhado' }
  )
  assert.deepEqual(result.phrases, [])
  assert.equal(result.warnings.length, 3)
  for (const [index, line] of [2, 3, 4].entries())
    assert.match(
      result.warnings[index],
      new RegExp(`components/home\\.tsx:${line}: t is passed on`)
    )
})

test('warns when the translator is renamed in props or assigned to another variable', async (t) => {
  const result = await analyze(
    t,
    `export default function Home({ t }) {
  const tr = t
  return tr('Aliased')
}
function OtherHome({ t: translate }) {
  return translate('Renamed')
}`,
    { Aliased: 'Alias', Renamed: 'Renomeado' }
  )
  assert.deepEqual(result.phrases, [])
  assert.equal(result.warnings.length, 2)
  assert.match(
    result.warnings[0],
    /components\/home\.tsx:2: t is passed on or renamed/
  )
  assert.match(
    result.warnings[1],
    /components\/home\.tsx:5: t is passed on or renamed/
  )
})

test('extracts all supported literal quotes and ignores a shadowed t', async (t) => {
  const result = await analyze(
    t,
    `export default function Home({ t }) {
  const unrelated = (t) => t('Shadowed')
  return [t('Single'), t("Double"), t(\`Template\`), unrelated(String)]
}`,
    { Single: 'Simples', Double: 'Duplas', Template: 'Template' }
  )
  assert.deepEqual(result.phrases, ['Single', 'Double', 'Template'])
  assert.deepEqual(result.warnings, [])
})
