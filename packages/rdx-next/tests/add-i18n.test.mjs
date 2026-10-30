import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  readdir,
  symlink,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  addI18n,
  i18nInstallRequest,
  parseAddArguments,
} from '../bin/add-plugin.mjs'
import {
  activateI18n,
  inspectI18n,
  i18nPackage,
} from '../bin/plugin-config.mjs'
import { initialLocales } from '../bin/i18n-setup.mjs'

const source = `// Keep my settings\nexport default { metadata: { applicationName: 'Docs' }, lang: 'pt-BR', navbar: { title: 'My project' } }\n`
const pluginRoot = fileURLToPath(
  new URL('../../rdx-plugin-i18n', import.meta.url)
)
const cli = fileURLToPath(new URL('../bin/rdx.mjs', import.meta.url))
const silent = () => {}
async function fixture(t, config = source) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-add-i18n-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(path.join(root, 'rdx.config.ts'), config)
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'docs', type: 'module', private: true })
  )
  return root
}
async function install(root) {
  const target = path.join(root, 'node_modules', i18nPackage)
  await mkdir(path.dirname(target), { recursive: true })
  await symlink(
    pluginRoot,
    target,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: { [i18nPackage]: 'file:./plugin.tgz' },
    })
  )
}
async function assertNoTemporaryFiles(root) {
  assert.equal(
    (await readdir(root)).some(
      (name) => name.includes('.bak') || name.startsWith('rdx.config.add-')
    ),
    false
  )
}

test('language setup uses primary lang, canonical tags and native labels; duplicates and invalid inputs fail', () => {
  const locales = initialLocales('pt-br', 'en, es-es, pt-BR')
  assert.deepEqual(
    locales.map(({ code }) => code),
    ['pt-BR', 'en', 'es-ES']
  )
  assert.equal(locales[1].label, 'English')
  assert.equal(locales[0].folder, undefined)
  for (const tag of ['en-US-u-ca-gregory', 'en-x-acme'])
    assert.equal(initialLocales('pt-BR', tag).at(-1).code, tag)
  for (const value of ['', 'pt-BR', 'en,en', '../en', 'en,', 'ptbr'])
    assert.throws(() => initialLocales('pt-BR', value))
  assert.deepEqual(
    parseAddArguments([
      'i18n',
      '--locales',
      'en,es-ES',
      '--package-manager',
      'yarn',
    ]),
    { locales: 'en,es-ES', packageManager: 'yarn' }
  )
  for (const args of [
    ['i18n', '--locales'],
    ['i18n', '--locales', 'en', '--locales', 'fr'],
    ['versioning', '--locales', 'en'],
  ])
    assert.throws(() => parseAddArguments(args), /Usage/)
  assert.equal(i18nInstallRequest('4.0.0').specifier, `${i18nPackage}@latest`)
  assert.equal(
    i18nInstallRequest('4.0.0-beta.1').specifier,
    `${i18nPackage}@beta`
  )
  assert.equal(i18nInstallRequest('4.0.0-rc.1').specifier, `${i18nPackage}@rc`)
  assert.deepEqual(i18nInstallRequest('4.0.0', '^0.1.0'), { kind: 'restore' })
})

test('configuration edits retain comments, aliases, unrelated plugins and existing options', () => {
  assert.deepEqual(inspectI18n(source), { configured: false, lang: 'pt-BR' })
  const configured = activateI18n(source, initialLocales('pt-BR', 'en'))
  assert.match(configured, /Keep my settings/)
  assert.match(configured, /navbar: \{ title: 'My project' \}/)
  assert.equal(activateI18n(configured, []), configured)
  assert.deepEqual(inspectI18n(configured), { configured: true })
  const custom = `import { i18n as languages } from '${i18nPackage}'\r\nexport default { lang: 'en', plugins: [other(), languages({ locales: customLocales })] }`
  assert.equal(activateI18n(custom, []), custom)
  const namespace = `import * as languages from '${i18nPackage}'; export default { plugins: [languages.i18n({ locales: [] })] }`
  assert.equal(activateI18n(namespace, []), namespace)
  const collision = activateI18n(
    `const i18n = 1; ${source}`,
    initialLocales('pt-BR', 'en')
  )
  assert.match(collision, /i18n as rdxI18n1/)
  const crlf = activateI18n(
    source.replaceAll('\n', '\r\n'),
    initialLocales('pt-BR', 'en')
  )
  assert.doesNotMatch(crlf, /(?<!\r)\n/)
  for (const config of [
    `const config = {}; export default config`,
    `export default { lang: getLang() }`,
    `export default { ...config }`,
  ])
    assert.throws(() => inspectI18n(config), /Cannot safely edit/)
})

test('first activation asks only for additional languages and preserves existing translations', async (t) => {
  const root = await fixture(t)
  await mkdir(path.join(root, 'locale/en/docs'), { recursive: true })
  await writeFile(
    path.join(root, 'locale/en/docs/intro.mdx'),
    '# Authored translation'
  )
  let asks = 0
  const result = await addI18n(root, {
    log: silent,
    env: {},
    ask: async (primary) => {
      asks++
      assert.equal(primary, 'pt-BR')
      return 'en,es-ES'
    },
    install: async (manager, cwd, env, request) => {
      assert.equal(request.specifier, `${i18nPackage}@latest`)
      await install(cwd)
    },
  })
  assert.equal(result.changed, true)
  assert.equal(asks, 1)
  assert.equal(
    await readFile(path.join(root, 'locale/en/docs/intro.mdx'), 'utf8'),
    '# Authored translation'
  )
  assert.equal(
    await readFile(path.join(root, 'locale/es-es/docs/.gitkeep'), 'utf8'),
    ''
  )
  const configured = await readFile(path.join(root, 'rdx.config.ts'), 'utf8')
  await addI18n(root, {
    log: silent,
    env: {},
    ask: () => assert.fail('must not ask again'),
    install: () => assert.fail('must not reinstall'),
  })
  assert.equal(
    await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
    configured
  )
  await assert.rejects(
    addI18n(root, { locales: 'fr', log: silent }),
    /already configured.*rdx.config.ts/
  )
  await assertNoTemporaryFiles(root)
})

test('cancelled prompts, invalid languages and unsupported configs do not install or create directories', async (t) => {
  const root = await fixture(t)
  const cancelled = await addI18n(root, {
    ask: async () => undefined,
    log: silent,
    install: () => assert.fail('cancelled'),
  })
  assert.equal(cancelled.cancelled, true)
  await assert.rejects(
    addI18n(root, { locales: 'en,en', install: () => assert.fail('invalid') }),
    /duplicate/
  )
  await writeFile(
    path.join(root, 'rdx.config.ts'),
    `export default { ...options }`
  )
  await assert.rejects(
    addI18n(root, {
      ask: () => assert.fail('dynamic config'),
      install: () => assert.fail('dynamic config'),
    }),
    /Cannot safely edit/
  )
  assert.deepEqual((await readdir(root)).sort(), [
    'package.json',
    'rdx.config.ts',
  ])
})

test('install failures, validation failures and concurrent edits preserve config and clean newly created folders', async (t) => {
  for (const mode of ['install', 'config', 'concurrent', 'folder']) {
    const config =
      mode === 'config'
        ? source.replace(
            "lang: 'pt-BR'",
            "lang: 'pt-BR', theme: { defaultTheme: 'purple' }"
          )
        : source
    const root = await fixture(t, config)
    if (mode === 'folder')
      await writeFile(path.join(root, 'locale'), 'Keep this file')
    await assert.rejects(
      addI18n(root, {
        locales: 'en,es-ES',
        log: silent,
        env: {},
        install: async () => {
          if (mode === 'install') throw new Error('offline')
          await install(root)
          if (mode === 'concurrent')
            await writeFile(
              path.join(root, 'rdx.config.ts'),
              '// User edit\n' + config
            )
        },
      }),
      mode === 'install'
        ? /offline/
        : mode === 'concurrent'
          ? /changed during installation/
          : /validation failed/
    )
    assert.equal(
      await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
      (mode === 'concurrent' ? '// User edit\n' : '') + config
    )
    if (mode === 'folder')
      assert.equal(
        await readFile(path.join(root, 'locale'), 'utf8'),
        'Keep this file'
      )
    else assert.equal((await readdir(root)).includes('locale'), false)
    await assertNoTemporaryFiles(root)
  }
})

test('translation parent links cannot create folders outside the project', async (t) => {
  const root = await fixture(t)
  const outside = await fixture(t)
  await symlink(
    outside,
    path.join(root, 'locale'),
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  await assert.rejects(
    addI18n(root, {
      locales: 'en',
      log: silent,
      env: {},
      install: () => install(root),
    }),
    /regular project directories/
  )
  assert.deepEqual((await readdir(outside)).sort(), [
    'package.json',
    'rdx.config.ts',
  ])
  assert.equal(await readFile(path.join(root, 'rdx.config.ts'), 'utf8'), source)
  await assertNoTemporaryFiles(root)
})

test('declared but missing plugin restores its range, aliases and configured languages without prompting', async (t) => {
  const config = activateI18n(source, [
    { code: 'pt-BR', label: 'Português' },
    { code: 'en', label: 'My English', folder: 'english' },
  ])
  const root = await fixture(t, config)
  const manifest = JSON.stringify({
    type: 'module',
    devDependencies: { [i18nPackage]: '^0.1.0' },
  })
  await writeFile(path.join(root, 'package.json'), manifest)
  await addI18n(root, {
    log: silent,
    env: {},
    ask: () => assert.fail('already configured'),
    install: async (manager, cwd, env, request) => {
      assert.deepEqual(request, { kind: 'restore' })
      await install(cwd)
      await writeFile(path.join(root, 'package.json'), manifest)
    },
  })
  assert.equal(await readFile(path.join(root, 'rdx.config.ts'), 'utf8'), config)
  assert.equal(
    await readFile(path.join(root, 'package.json'), 'utf8'),
    manifest
  )
  assert.equal(
    await readFile(path.join(root, 'locale/english/docs/.gitkeep'), 'utf8'),
    ''
  )
})

test('real CLI installs offline, activates languages, prepares localized routes and remains repeatable', async (t) => {
  const root = await fixture(t)
  await mkdir(path.join(root, 'docs/guides'), { recursive: true })
  await writeFile(path.join(root, 'docs/guides/intro.mdx'), '# Original')
  await writeFile(
    path.join(root, 'installer-fixture.json'),
    JSON.stringify({
      pluginRoot,
      expectedArgs: ['install', `${i18nPackage}@latest`],
    })
  )
  const env = {
    ...process.env,
    npm_config_user_agent: 'npm/12',
    npm_execpath: fileURLToPath(
      new URL('./fixtures/package-manager.mjs', import.meta.url)
    ),
  }
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 60_000,
    })
  const missing = run('add', 'i18n')
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /needs a terminal.*--locales/)
  const result = run('add', 'i18n', '--locales', 'en,es-ES')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /i18n activated/)
  assert.match(result.stdout, /runtime prepared/)
  assert.equal(
    await readFile(path.join(root, 'docs/guides/intro.mdx'), 'utf8'),
    '# Original'
  )
  assert.ok(
    (await readdir(path.join(root, '.rdx/app'))).includes('(rdx-locales)')
  )
  const repeated = run('add', 'i18n')
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.match(repeated.stdout, /already configured/)
  assert.equal(
    await readFile(path.join(root, 'installer-calls.txt'), 'utf8'),
    'install\n'
  )
  const checked = run('check')
  assert.equal(checked.status, 0, checked.stderr)
  assert.match(checked.stdout, /1 page checked, 0 problems/)
})
