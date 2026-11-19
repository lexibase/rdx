import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  realpath,
  writeFile,
  rm,
  access,
  mkdir,
  cp,
  symlink,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const cli = fileURLToPath(new URL('../bin/rdx.mjs', import.meta.url))
const definition = new URL('../dist/index.js', import.meta.url).href
async function fixture(t, config) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-cli-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  if (config) await writeFile(path.join(rootDir, 'rdx.config.ts'), config)
  return rootDir
}
function run(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' })
}

test('i18n sync adds missing homepage phrases, preserves catalogs and validates before writing', async (t) => {
  const plugin = new URL('../../rdx-plugin-i18n/dist/index.js', import.meta.url)
    .href
  const rootDir = await fixture(
    t,
    `import { i18n } from '${plugin}'; export default {
    metadata: { applicationName: 'Docs' }, lang: 'en', homepage: { enabled: true, translations: true },
    plugins: [i18n({ locales: [{ code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português', folder: 'ptbr' }, { code: 'fr-FR', label: 'Français' }] })]
  }`
  )
  await mkdir(path.join(rootDir, 'components'))
  for (const folder of ['ptbr', 'fr-fr'])
    await mkdir(path.join(rootDir, 'locale', folder, 'docs'), {
      recursive: true,
    })
  await writeFile(
    path.join(rootDir, 'components/home.tsx'),
    `export default function Home({ t, label }) { return [t('Welcome'), t('Read the docs'), t('__proto__'), t('Welcome'), t(label)] }`
  )
  const portuguese = path.join(rootDir, 'locale/ptbr/home.json')
  const french = path.join(rootDir, 'locale/fr-fr/home.json')
  const existing = {
    Welcome: 'Bem-vindo',
    Old: 'Antigo',
    $metadata: { title: 'Atlas' },
  }
  const before = JSON.stringify(existing)
  await writeFile(portuguese, before)
  await writeFile(french, '[]')
  const rejected = run(rootDir, 'i18n', 'sync')
  assert.equal(rejected.status, 1)
  assert.match(rejected.stderr, /Cannot sync locale\/fr-fr\/home\.json/)
  assert.equal(await readFile(portuguese, 'utf8'), before)
  assert.equal(await readFile(french, 'utf8'), '[]')
  await rm(french)

  const synced = run(rootDir, 'i18n', 'sync')
  assert.equal(synced.status, 0, synced.stderr)
  assert.match(synced.stdout, /locale\/ptbr\/home\.json: added 2 phrases/)
  assert.match(synced.stdout, /locale\/fr-fr\/home\.json: added 3 phrases/)
  assert.match(
    synced.stderr,
    /components\/home\.tsx:1: t\(\) needs a literal phrase/
  )
  const after = await readFile(portuguese, 'utf8')
  assert.deepEqual(JSON.parse(after), {
    ...existing,
    'Read the docs': '',
    ['__proto__']: '',
  })
  assert.deepEqual(JSON.parse(await readFile(french, 'utf8')), {
    Welcome: '',
    'Read the docs': '',
    ['__proto__']: '',
  })
  const repeated = run(rootDir, 'i18n', 'sync')
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.match(repeated.stdout, /Homepage catalogs are up to date/)
  assert.equal(await readFile(portuguese, 'utf8'), after)
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

async function nextProbe(rootDir) {
  const directory = path.join(rootDir, 'node_modules/next/dist/bin')
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(rootDir, 'node_modules/next/package.json'),
    '{"name":"next","type":"commonjs"}'
  )
  await writeFile(
    path.join(directory, 'next'),
    `require('node:fs').writeFileSync('next-invocation.json', JSON.stringify(process.argv.slice(2))); console.log('NEXT_PROBE_STARTED')`
  )
}

test('build rejects broken content before changing the runtime or starting Next', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '[Missing](missing.mdx)\n\n![Image](/missing.png)'
  )
  await mkdir(path.join(rootDir, '.rdx/app'), { recursive: true })
  const layout = path.join(rootDir, '.rdx/app/layout.tsx')
  await writeFile(layout, 'Existing runtime')
  const result = run(rootDir, 'build')
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /docs\/intro.mdx:1:1 \[page\]/)
  assert.match(result.stderr, /docs\/intro.mdx:3:1 \[asset\]/)
  assert.match(result.stderr, /2 problems/)
  assert.equal(await readFile(layout, 'utf8'), 'Existing runtime')
  await assert.rejects(access(path.join(rootDir, 'next-invocation.json')))
  await assert.rejects(access(path.join(rootDir, 'public')))
})

test('valid build checks content then prepares runtime and forwards Next arguments', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '## Hello\n\n[Hello](#hello)'
  )
  const result = run(rootDir, 'build', '--debug')
  assert.equal(result.status, 0, result.stderr)
  assert.match(
    result.stdout,
    /1 page checked, 0 problems[\s\S]*NEXT_PROBE_STARTED/
  )
  await access(path.join(rootDir, '.rdx/app/layout.tsx'))
  assert.deepEqual(
    JSON.parse(
      await readFile(path.join(rootDir, 'next-invocation.json'), 'utf8')
    ),
    ['build', path.join(rootDir, '.rdx'), '--debug']
  )
})

test('build checks archived documentation as well as live content', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(path.join(rootDir, 'docs/intro.mdx'), '## Live')
  await mkdir(path.join(rootDir, 'versioned_docs/version-1.0.0'), {
    recursive: true,
  })
  await writeFile(
    path.join(rootDir, 'versions.json'),
    JSON.stringify({ active: [], archived: ['1.0.0'] })
  )
  await writeFile(
    path.join(rootDir, 'versioned_docs/version-1.0.0/intro.mdx'),
    '[Missing](#missing)'
  )
  const result = run(rootDir, 'build')
  assert.equal(result.status, 1, result.stdout)
  assert.match(
    result.stderr,
    /versioned_docs\/version-1.0.0\/intro.mdx:1:1 \[anchor\]/
  )
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('dev and start do not block on documentation checks', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' } }"
  )
  await nextProbe(rootDir)
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '[Missing](missing.mdx)'
  )
  for (const command of ['dev', 'start']) {
    const result = run(rootDir, command)
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /NEXT_PROBE_STARTED/)
    assert.doesNotMatch(result.stdout + result.stderr, /RDX check/)
  }
})

test('check aggregates content errors and never prepares runtime, assets or a Next server', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' } }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '---\ntitle: Intro\n---\n\n[Missing](missing.mdx)\n\n![Image](/missing.png)'
  )
  let result = run(rootDir, 'check')
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stderr, /docs\/intro.mdx:5:1 \[page\]/)
  assert.match(result.stderr, /docs\/intro.mdx:7:1 \[asset\]/)
  assert.match(result.stderr, /2 problems/)
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '## Hello\n\n[Section](#hello)'
  )
  result = run(rootDir, 'check')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 page checked, 0 problems/)
  await writeFile(path.join(rootDir, 'docs/unlinked.md'), '# Unlinked')
  result = run(rootDir, 'check')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /docs\/unlinked.md:1:1 \[warning: unlinked\]/)
  assert.match(result.stdout, /2 pages checked, 0 problems, 1 warning/)
  await writeFile(
    path.join(rootDir, 'docs/intro.mdx'),
    '## Installation\n\n[Section](#installaton)'
  )
  result = run(rootDir, 'check')
  assert.equal(result.status, 1, result.stdout)
  assert.match(
    result.stderr,
    /\[anchor\].*\r?\n {2}Did you mean "#installation"\?/
  )
  for (const filename of ['.rdx', 'public', 'versions.json'])
    await assert.rejects(access(path.join(rootDir, filename)))
})

test('check accepts generated endpoints and localized homes in normal and JSON reports', async (t) => {
  const rootDir = await fixture(
    t,
    `export default {
    metadata: { applicationName: 'Docs', metadataBase: 'https://docs.example.com' },
    basePath: '/tool',
    homepage: { enabled: true },
    search: true,
    plugins: [{ name: 'locale-fixture', apiVersion: 1, setup: () => ({
      localization: { locales: [
        { code: 'en', label: 'English' },
        { code: 'pt-BR', label: 'Português', folder: 'ptbr' }
      ] }
    }) }]
  }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(
    path.join(rootDir, 'docs/intro.md'),
    [
      '[Home](https://docs.example.com/tool/pt-br)',
      '[Index](/en/docs/llms.txt)',
      '[Markdown](/rdx-markdown/en/docs/intro.md)',
      '[Search](/pt-br/rdx-search/_)',
    ].join('\n\n')
  )
  await mkdir(path.join(rootDir, 'locale/ptbr/docs'), { recursive: true })
  const normal = run(rootDir, 'check')
  assert.equal(normal.status, 0, normal.stderr)
  assert.match(normal.stdout, /RDX check passed/)
  const json = run(rootDir, 'check', '--json')
  assert.equal(json.status, 0, json.stderr)
  assert.deepEqual(JSON.parse(json.stdout).diagnostics, [])
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('check --json writes errors, suggestions and warnings to stdout', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' } }`
  )
  const docs = path.join(rootDir, 'docs')
  await mkdir(docs)
  const intro = path.join(docs, '01-intro.md')
  await writeFile(intro, '# Installation\n\n[Section](#installaton)\n')
  await writeFile(path.join(docs, 'reference.md'), '# Reference\n')

  const failed = run(rootDir, 'check', '--json')
  assert.equal(failed.status, 1, failed.stderr)
  assert.equal(failed.stderr, '')
  const report = JSON.parse(failed.stdout)
  assert.equal(report.checkedPages, 2)
  assert.deepEqual(report.diagnostics, [
    {
      file: 'docs/01-intro.md',
      line: 3,
      column: 1,
      code: 'anchor',
      message:
        '"#installaton": Section "#installaton" does not exist in docs/01-intro.md.',
      suggestion: '#installation',
    },
  ])
  assert.deepEqual(
    report.warnings.map(({ code }) => code),
    ['unlinked']
  )

  await writeFile(intro, '# Installation\n')
  const warningsOnly = run(rootDir, 'check', '--json')
  assert.equal(warningsOnly.status, 0, warningsOnly.stderr)
  assert.deepEqual(JSON.parse(warningsOnly.stdout), {
    ...report,
    diagnostics: [],
  })

  const atLimit = run(rootDir, 'check', '--max-warnings', '1')
  assert.equal(atLimit.status, 0, atLimit.stderr)
  assert.match(atLimit.stdout, /RDX check passed/)

  const overLimit = run(rootDir, 'check', '--max-warnings', '0')
  assert.equal(overLimit.status, 1)
  assert.match(overLimit.stderr, /Warning limit exceeded \(maximum 0\)/)
  assert.match(overLimit.stderr, /RDX check failed/)

  const jsonOverLimit = run(rootDir, 'check', '--max-warnings', '0', '--json')
  assert.equal(jsonOverLimit.status, 1)
  assert.equal(jsonOverLimit.stderr, '')
  assert.deepEqual(JSON.parse(jsonOverLimit.stdout), {
    ...report,
    diagnostics: [],
    maxWarnings: 0,
    warningLimitExceeded: true,
  })

  await writeFile(intro, '[Reference](./reference.md)\n')
  const clean = run(rootDir, 'check', '--json')
  assert.equal(clean.status, 0, clean.stderr)
  assert.deepEqual(JSON.parse(clean.stdout), {
    checkedPages: 2,
    diagnostics: [],
    warnings: [],
  })
  const zeroWarnings = run(rootDir, 'check', '--json', '--max-warnings=0')
  assert.equal(zeroWarnings.status, 0, zeroWarnings.stderr)
  assert.deepEqual(JSON.parse(zeroWarnings.stdout), {
    ...JSON.parse(clean.stdout),
    maxWarnings: 0,
    warningLimitExceeded: false,
  })
  await writeFile(intro, '[Reference](/docs/old-reference)\n')
  await writeFile(
    path.join(docs, 'reference.md'),
    '---\nredirectFrom: [/docs/old-reference]\n---\n# Reference\n'
  )
  const redirected = run(rootDir, 'check', '--json', '--max-warnings', '0')
  assert.equal(redirected.status, 1, redirected.stderr)
  const redirectedReport = JSON.parse(redirected.stdout)
  assert.deepEqual(redirectedReport.diagnostics, [])
  assert.equal(redirectedReport.warningLimitExceeded, true)
  assert.deepEqual(
    redirectedReport.warnings.map(({ code, suggestion }) => [code, suggestion]),
    [['redirected-link', '/docs/reference']]
  )
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('check baseline ignores line changes but catches a new occurrence at the same warning total', async (t) => {
  const rootDir = await fixture(
    t,
    'export default { metadata: { applicationName: "Docs" } }'
  )
  const docs = path.join(rootDir, 'docs')
  await mkdir(docs)
  const intro = path.join(docs, '01-intro.md')
  const oldLink = '[Guide](/docs/old-guide)'
  await writeFile(intro, `# Intro\n\n${oldLink}\n`)
  await writeFile(
    path.join(docs, 'guide.md'),
    '---\nredirectFrom: [/docs/old-guide]\n---\n# Guide\n'
  )
  await writeFile(path.join(docs, 'reference.md'), '# Reference\n')
  const baseline = 'rdx-check-baseline.json'
  const created = run(rootDir, 'check', '--write-baseline', baseline)
  assert.equal(created.status, 0, created.stderr)
  const baselinePath = path.join(rootDir, baseline)
  const saved = await readFile(baselinePath, 'utf8')
  const entries = JSON.parse(saved)
  assert.equal(entries.version, 1)
  assert.equal(entries.warnings.length, 2)
  assert.deepEqual(Object.keys(entries.warnings[0]).sort(), [
    'code',
    'file',
    'message',
  ])

  const overwrite = run(rootDir, 'check', '--write-baseline', baseline)
  assert.equal(overwrite.status, 1)
  assert.match(overwrite.stderr, /already exists/)
  assert.equal(await readFile(baselinePath, 'utf8'), saved)

  await writeFile(intro, `# Intro\n\nNew paragraph.\n\n${oldLink}\n`)
  const moved = run(rootDir, 'check', '--baseline', baseline, '--json')
  assert.equal(moved.status, 0, moved.stderr)
  assert.deepEqual(JSON.parse(moved.stdout).baseline, {
    file: baseline,
    knownWarningCount: 2,
    newWarnings: [],
  })

  await writeFile(
    intro,
    `# Intro\n\n${oldLink}\n\n${oldLink}\n\n[Reference](./reference.md)\n`
  )
  const compare = run(
    rootDir,
    'check',
    '--baseline',
    baseline,
    '--max-warnings',
    '2',
    '--json'
  )
  assert.equal(compare.status, 1)
  const report = JSON.parse(compare.stdout)
  assert.deepEqual(report.diagnostics, [])
  assert.equal(report.warnings.length, 2)
  assert.equal(report.warningLimitExceeded, false)
  assert.deepEqual(report.baseline, {
    file: baseline,
    knownWarningCount: 1,
    newWarnings: [{ ...report.warnings[1], code: 'redirected-link', line: 5 }],
  })
  const human = run(rootDir, 'check', '--baseline', baseline)
  assert.equal(human.status, 1)
  assert.match(human.stderr, /Warning baseline: 1 known, 1 new/)
  assert.match(human.stderr, /RDX check failed/)
  assert.doesNotMatch(human.stderr, /01-intro\.md:3:/)

  await writeFile(intro, `# Intro\n\n${oldLink}\n\n[Broken](#missing)\n`)
  const broken = run(rootDir, 'check', '--baseline', baseline, '--json')
  assert.equal(broken.status, 1)
  const brokenReport = JSON.parse(broken.stdout)
  assert.equal(brokenReport.diagnostics[0].code, 'anchor')
  assert.deepEqual(brokenReport.baseline.newWarnings, [])
  const unwritten = run(rootDir, 'check', '--write-baseline', 'unwritten.json')
  assert.equal(unwritten.status, 1)
  await assert.rejects(access(path.join(rootDir, 'unwritten.json')))
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('check reports missing or invalid baseline files without writing a JSON report', async (t) => {
  const rootDir = await fixture(
    t,
    'export default { metadata: { applicationName: "Docs" } }'
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(path.join(rootDir, 'docs', 'intro.md'), '# Intro\n')
  const missing = run(rootDir, 'check', '--baseline', 'missing.json', '--json')
  assert.equal(missing.status, 1)
  assert.equal(missing.stdout, '')
  assert.match(missing.stderr, /Could not read warning baseline "missing.json"/)
  await writeFile(
    path.join(rootDir, 'invalid.json'),
    '{"version":1,"warnings":[{}]}'
  )
  const invalid = run(rootDir, 'check', '--baseline', 'invalid.json', '--json')
  assert.equal(invalid.status, 1)
  assert.equal(invalid.stdout, '')
  assert.match(invalid.stderr, /Invalid warning baseline "invalid.json"/)
})

test('check help and invalid arguments are handled before reading configuration', async (t) => {
  const rootDir = await fixture(t)
  const help = run(rootDir, 'check', '--help')
  assert.equal(help.status, 0)
  assert.match(help.stdout, /--json/)
  assert.match(help.stdout, /--max-warnings/)
  assert.match(help.stdout, /--write-baseline/)
  for (const args of [
    ['--baseline'],
    ['--write-baseline='],
    ['--baseline', 'a.json', '--write-baseline', 'b.json'],
  ]) {
    const invalid = run(rootDir, 'check', ...args)
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /Usage: rdx check/)
    assert.doesNotMatch(invalid.stderr, /Missing .*rdx.config/)
  }
  for (const args of [[], ['-1'], ['1.5'], ['9007199254740992']]) {
    const invalid = run(rootDir, 'check', '--max-warnings', ...args)
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /--max-warnings/)
    assert.doesNotMatch(invalid.stderr, /Missing .*rdx.config/)
  }
  const missingConfig = run(rootDir, 'check', '--json')
  assert.equal(missingConfig.status, 1)
  assert.equal(missingConfig.stdout, '')
  assert.match(missingConfig.stderr, /Missing .*rdx.config/)
  const result = run(rootDir, 'check', '--fix')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Usage: rdx check/)
  assert.doesNotMatch(result.stderr, /Missing .*rdx.config/)
})

test('all creator documentation examples pass the public check command without warnings', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' } }`
  )
  const template = new URL(
    '../../create-rdx/templates/default/',
    import.meta.url
  )
  for (const directory of ['docs', 'public']) {
    await cp(new URL(directory, template), path.join(rootDir, directory), {
      recursive: true,
    })
  }
  const result = run(rootDir, 'check', '--max-warnings', '0')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /0 problems/)
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('checking versioned content never initializes a missing manifest', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  const result = run(rootDir, 'check')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Run "rdx prepare"/)
  await assert.rejects(access(path.join(rootDir, 'versions.json')))
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('prepare loads typed config with defineConfig without loading a Next server or versioning', async (t) => {
  const rootDir = await fixture(
    t,
    `import { defineConfig } from '${definition}'; export default defineConfig({ metadata: { applicationName: 'Typed docs' } })`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 0, result.stderr)
  await access(path.join(rootDir, '.rdx/rdx-project.ts'))
  await assert.rejects(access(path.join(rootDir, 'versions.json')))
  const config = JSON.parse(
    await readFile(path.join(rootDir, '.rdx/tsconfig.json'))
  )
  assert.equal(config.compilerOptions.isolatedModules, true)
  assert.equal(config.compilerOptions.allowArbitraryExtensions, true)
  assert.equal(config.compilerOptions.noUncheckedSideEffectImports, true)
  assert.equal(config.compilerOptions.jsx, 'react-jsx')
  assert.equal(config.compilerOptions.rootDir, '..')
  assert.deepEqual(config.compilerOptions.types, ['node', 'react'])
  assert.equal(config.compilerOptions.baseUrl, undefined)
  assert.equal(config.compilerOptions.ignoreDeprecations, undefined)
  assert.ok(config.include.includes('.next/dev/types/**/*.ts'))
  // Simulate the installed adapter for the generated Next configuration.
  const scope = path.join(rootDir, 'node_modules/@lexibase')
  await mkdir(scope, { recursive: true })
  const adapterLink = path.join(scope, 'rdx-next')
  await symlink(
    fileURLToPath(new URL('../', import.meta.url)),
    adapterLink,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  t.after(() => rm(adapterLink, { force: true }))
  // The configuration resolves package metadata without loading a Next server.
  await mkdir(path.join(rootDir, 'node_modules/next'), { recursive: true })
  await writeFile(
    path.join(rootDir, 'node_modules/next/package.json'),
    '{"name":"next","version":"16.4.3"}'
  )
  const loadNextConfig = (
    await import(pathToFileURL(path.join(rootDir, '.rdx/next.config.mjs')).href)
  ).default
  const nextConfig = await loadNextConfig('phase-development-server')
  const canonicalRoot = await realpath(rootDir)
  assert.equal(path.resolve(nextConfig.turbopack.root), canonicalRoot)
  assert.equal(nextConfig.outputFileTracingRoot, canonicalRoot)
  assert.equal(nextConfig.agentRules, false)
  assert.equal(nextConfig.experimental?.externalDir, undefined)
  await assert.rejects(
    access(path.join(rootDir, '.rdx/.rdx-document-dates.json')),
    { code: 'ENOENT' }
  )
  await access(path.join(rootDir, '.rdx/app/globals.d.css.ts'))
  assert.ok(config.exclude.includes('public'))
})

test('prepare discovers project CSS without creating or replacing user styles', async (t) => {
  const root = await fixture(
    t,
    "export default { metadata: { applicationName: 'Styled docs' } }"
  )
  let result = run(root, 'prepare')
  assert.equal(result.status, 0, result.stderr)
  await assert.rejects(access(path.join(root, 'rdx.css')))
  const source = ':root { --rdx-highlighting: #7c3aed }'
  await writeFile(path.join(root, 'rdx.css'), source)
  for (let attempt = 0; attempt < 2; attempt++) {
    result = run(root, 'prepare')
    assert.equal(result.status, 0, result.stderr)
    const generated = await readFile(
      path.join(root, '.rdx/app/globals.css'),
      'utf8'
    )
    assert.equal(generated.match(/@import "\.\.\/\.\.\/rdx\.css";/g)?.length, 1)
    assert.equal(await readFile(path.join(root, 'rdx.css'), 'utf8'), source)
  }
})

test('preflight rejects invalid config before creating .rdx', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' }, theme: { defaultTheme: 'purple' } }`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /theme.defaultTheme/)
  await assert.rejects(access(path.join(rootDir, '.rdx')))
})

test('removed docsDir option fails before preparing runtime or moving content', async (t) => {
  const rootDir = await fixture(
    t,
    "export default { metadata: { applicationName: 'Docs' }, docsDir: 'content' }"
  )
  await mkdir(path.join(rootDir, 'content'))
  const filename = path.join(rootDir, 'content/intro.mdx')
  await writeFile(filename, 'Existing documentation')
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /docsDir is not configurable.*docs\//)
  assert.equal(await readFile(filename, 'utf8'), 'Existing documentation')
  await assert.rejects(access(path.join(rootDir, '.rdx')))
  await assert.rejects(access(path.join(rootDir, 'docs')))
})

test('plugin commands are registered only through config', async (t) => {
  const rootDir = await fixture(
    t,
    `export default { metadata: { applicationName: 'Docs' }, plugins: [{ name: 'fixture', apiVersion: 1, commands: [{ name: 'ping', description: 'Fixture command', run(context) { console.log(context.args.join(':')) } }] }] }`
  )
  const result = run(rootDir, 'ping', 'hello', 'world')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /hello:world/)
  const unavailable = run(rootDir, 'version', '1.0.0')
  assert.equal(unavailable.status, 1)
  assert.match(unavailable.stderr, /Unknown command.*version/)
  for (const command of ['archive', 'unarchive']) {
    const missing = run(rootDir, command, '1.0.0')
    assert.equal(missing.status, 1)
    assert.match(missing.stderr, new RegExp(`Unknown command.*${command}`))
  }
})

test('versioning archive commands work through the CLI without preparing a runtime', async (t) => {
  const plugin = new URL(
    '../../rdx-plugin-versioning/dist/index.js',
    import.meta.url
  ).href
  const rootDir = await fixture(
    t,
    `import { versioning } from '${plugin}'; export default { metadata: { applicationName: 'Docs' }, plugins: [versioning()] }`
  )
  await mkdir(path.join(rootDir, 'docs'))
  await writeFile(path.join(rootDir, 'docs/intro.mdx'), 'Preserved snapshot')
  for (const command of ['version', 'archive', 'unarchive']) {
    const result = run(rootDir, command, '1.0.0')
    assert.equal(result.status, 0, result.stderr)
    const manifest = JSON.parse(
      await readFile(path.join(rootDir, 'versions.json'), 'utf8')
    )
    assert.deepEqual(
      manifest,
      command === 'archive'
        ? { active: [], archived: ['1.0.0'] }
        : { active: ['1.0.0'], archived: [] }
    )
  }
  assert.equal(
    await readFile(
      path.join(rootDir, 'versioned_docs/version-1.0.0/intro.mdx'),
      'utf8'
    ),
    'Preserved snapshot'
  )
  await assert.rejects(access(path.join(rootDir, '.rdx')))
  const invalid = run(rootDir, 'archive', '9.0.0')
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /does not exist/)
})

test('missing configuration and missing plugin packages fail with actionable messages', async (t) => {
  const rootDir = await fixture(t)
  assert.match(run(rootDir, 'prepare').stderr, /Missing.*rdx.config.ts/)
  await writeFile(
    path.join(rootDir, 'rdx.config.ts'),
    `import plugin from '@rdx-nonexistent/plugin'; export default { metadata: { applicationName: 'Docs' }, plugins: [plugin()] }`
  )
  const result = run(rootDir, 'prepare')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /install its package/)
})
