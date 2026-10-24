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
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  addVersioning,
  detectPackageManager,
  installPackage,
  parseAddArguments,
  versioningInstallRequest,
} from '../bin/add-plugin.mjs'
import { activateVersioning, versioningPackage } from '../bin/plugin-config.mjs'

const cli = fileURLToPath(new URL('../bin/rdx.mjs', import.meta.url))
const runtimePackage = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
)
const expectedInstallArgs = [
  'install',
  versioningInstallRequest(runtimePackage.version).specifier,
]
const basic = `// Project documentation\nexport default { metadata: { applicationName: 'Docs' }, navbar: { title: 'Custom' } }\n`
async function fixture(t, source = basic) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-add-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  await writeFile(path.join(root, 'rdx.config.ts'), source)
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', private: true, type: 'module' })
  )
  return root
}
async function installStub(root, { invalid = false } = {}) {
  const directory = path.join(root, 'node_modules/@lexibase/rdx-versioning')
  await mkdir(directory, { recursive: true })
  await writeFile(
    path.join(directory, 'package.json'),
    JSON.stringify({
      name: versioningPackage,
      type: 'module',
      exports: './index.js',
    })
  )
  await writeFile(
    path.join(directory, 'index.js'),
    `export function versioning(options = {}) { return { name: '${versioningPackage}', apiVersion: ${invalid ? 2 : 1}, options } }`
  )
  const pkgFile = path.join(root, 'package.json')
  const pkg = JSON.parse(await readFile(pkgFile, 'utf8'))
  pkg.dependencies = { [versioningPackage]: '1.0.0-beta.2' }
  await writeFile(pkgFile, JSON.stringify(pkg))
}
const silent = () => {}

test('literal editing preserves imports, aliases, comments, plugin options, CRLF and repeatability', () => {
  const source = `import { defineConfig as config } from '@lexibase/rdx-next'\r\nimport { versioning as snapshots } from '${versioningPackage}'\r\n// Keep this\r\nexport default config({ metadata: { applicationName: 'Docs' }, plugins: [snapshots({ versionsDir: 'history' })], navbar: { title: '' } } satisfies Config)\r\n`
  assert.equal(activateVersioning(source), source)
  const existing = `import * as snapshots from '${versioningPackage}'\nexport default { metadata: { applicationName: 'Docs' }, plugins: [snapshots.versioning()] }`
  assert.equal(activateVersioning(existing), existing)
  const unrelated = `import { defineConfig } from '@lexibase/rdx-next'\nconst versioning = 'reserved';\nexport default defineConfig({ metadata: { applicationName: 'Docs' }, plugins: [other(), /* keep */], homepage: { enabled: false } })`
  const result = activateVersioning(unrelated)
  assert.match(result, /versioning as rdxVersioning1/)
  assert.match(result, /other\(\), rdxVersioning1\(\), \/\* keep \*\//)
  assert.match(result, /homepage: \{ enabled: false \}/)
  assert.equal(activateVersioning(result), result)
  const crlf = activateVersioning(basic.replaceAll('\n', '\r\n'))
  assert.doesNotMatch(crlf, /(?<!\r)\n/)
})

test('unsafe dynamic shapes and syntax errors receive manual instructions', () => {
  for (const source of [
    `export default makeConfig({ metadata: { applicationName: 'Docs' } })`,
    `const config = { metadata: { applicationName: 'Docs' } }; export default config`,
    `export default { metadata: { applicationName: 'Docs' }, ...options }`,
    `export default { metadata: { applicationName: 'Docs' }, plugins: getPlugins() }`,
    `export default { metadata: { applicationName: 'Docs' }, plugins: [...plugins] }`,
    `export default { metadata: { applicationName: 'Docs' }, ['plugins']: [] }`,
    `export default { metadata: { applicationName: 'Docs' }, plugins: [], plugins: [] }`,
    `export default {`,
  ])
    assert.throws(
      () => activateVersioning(source),
      /Cannot safely edit.*manually/
    )
})

test('manager detection uses declaration, locks, then invoking manager; ambiguity needs explicit choice', async (t) => {
  const root = await fixture(t)
  assert.equal(await detectPackageManager(root, {}, {}), 'npm')
  assert.equal(
    await detectPackageManager(root, {}, { npm_config_user_agent: 'yarn/4.0' }),
    'yarn'
  )
  assert.equal(
    await detectPackageManager(root, { packageManager: 'pnpm@9.0.0' }, {}),
    'pnpm'
  )
  await writeFile(path.join(root, 'pnpm-lock.yaml'), '')
  assert.equal(
    await detectPackageManager(root, {}, { npm_config_user_agent: 'npm/12' }),
    'pnpm'
  )
  await writeFile(path.join(root, 'package-lock.json'), '{}')
  await assert.rejects(detectPackageManager(root, {}, {}), /Conflicting/)
  assert.equal(await detectPackageManager(root, {}, {}, 'pnpm'), 'pnpm')
  await assert.rejects(
    detectPackageManager(root, { packageManager: 'bun@1' }, {}),
    /Unsupported/
  )
})

test('release channels follow stable/beta/RC runtime versions and never silently fall back', () => {
  for (const [version, channel] of [
    ['1.0.0', 'latest'],
    ['2.1.3+build.7', 'latest'],
    ['1.0.0-beta.10', 'beta'],
    ['1.0.0-beta', 'beta'],
    ['1.0.0-rc.1', 'rc'],
    ['1.0.0-rc.1+build.7', 'rc'],
  ])
    assert.deepEqual(versioningInstallRequest(version), {
      kind: 'add',
      specifier: `${versioningPackage}@${channel}`,
    })
  for (const version of [
    '1.0',
    'v1.0.0',
    '01.0.0',
    '1.0.0-beta.01',
    '',
    undefined,
  ])
    assert.throws(
      () => versioningInstallRequest(version),
      /runtime version is invalid/
    )
  for (const version of ['1.0.0-alpha.1', '1.0.0-canary.1', '1.0.0-1'])
    assert.throws(
      () => versioningInstallRequest(version),
      /Unsupported.*channel.*no channel fallback/
    )
  for (const declared of ['1.0.0-beta.2', '^1.0.0', 'file:./plugin.tgz'])
    assert.deepEqual(versioningInstallRequest('1.0.0', declared), {
      kind: 'restore',
    })
  for (const declared of ['', ' ', 1, false])
    assert.throws(
      () => versioningInstallRequest('1.0.0', declared),
      /non-empty string/
    )
})

test('offline npm/pnpm/yarn execution installs the chosen channel or restores without replacing dependency specs', async (t) => {
  const root = await fixture(t)
  for (const manager of ['npm', 'pnpm', 'yarn']) {
    const env = {
      ...process.env,
      npm_config_user_agent: `${manager}/1`,
      npm_execpath: fileURLToPath(
        new URL('./fixtures/record-installer.mjs', import.meta.url)
      ),
    }
    for (const version of ['1.0.0', '1.0.0-beta.10', '1.0.0-rc.1']) {
      const request = versioningInstallRequest(version)
      await installPackage(manager, root, env, request)
      assert.deepEqual(
        JSON.parse(
          await readFile(path.join(root, 'installer-args.json'), 'utf8')
        ),
        [manager === 'npm' ? 'install' : 'add', request.specifier]
      )
    }
    await installPackage(
      manager,
      root,
      env,
      versioningInstallRequest('1.0.0', '^1.0.0-beta.2')
    )
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(root, 'installer-args.json'), 'utf8')
      ),
      ['install']
    )
  }
})

test('first activation installs and validates without leaving backups or temporary files', async (t) => {
  const root = await fixture(t)
  let calls = 0
  const options = {
    log: silent,
    env: {},
    install: async (manager, cwd, env, request) => {
      assert.equal(manager, 'npm')
      assert.equal(cwd, root)
      assert.deepEqual(
        request,
        versioningInstallRequest(runtimePackage.version)
      )
      calls++
      await installStub(root)
    },
  }
  const result = await addVersioning(root, options)
  assert.equal(result.changed, true)
  assert.equal('backup' in result, false)
  assert.equal(
    (await readdir(root)).some((name) => name.endsWith('.bak')),
    false
  )
  const updated = await readFile(path.join(root, 'rdx.config.ts'), 'utf8')
  assert.match(updated, /plugins: \[versioning\(\)\]/)
  assert.match(updated, /navbar: \{ title: 'Custom' \}/)
  assert.match(updated, /\/\/ Project documentation/)
  const again = await addVersioning(root, options)
  assert.equal(again.changed, false)
  assert.equal(calls, 1)
  const files = await readdir(root)
  assert.equal(files.filter((name) => name.endsWith('.bak')).length, 0)
  assert.equal(
    files.some((name) => name.startsWith('rdx.config.add-')),
    false
  )
  assert.equal(files.includes('versions.json'), false)
  assert.equal(files.includes('.rdx'), false)
})

test('installed-but-disabled and configured-but-missing packages are repaired without duplicate entries', async (t) => {
  const root = await fixture(t)
  await installStub(root)
  await addVersioning(root, {
    log: silent,
    env: {},
    install: () => assert.fail('must not reinstall'),
  })
  const activated = await readFile(path.join(root, 'rdx.config.ts'), 'utf8')
  await rm(path.join(root, 'node_modules'), { recursive: true })
  let installs = 0
  const result = await addVersioning(root, {
    log: silent,
    env: {},
    install: async (manager, cwd, env, request) => {
      assert.deepEqual(request, { kind: 'restore' })
      installs++
      await installStub(root)
    },
  })
  assert.equal(installs, 1)
  assert.equal(result.changed, false)
  assert.equal(
    await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
    activated
  )
})

test('installation and validation failures leave the original configuration intact', async (t) => {
  for (const failure of ['install', 'plugin', 'config']) {
    const source =
      failure === 'config'
        ? `export default { metadata: { applicationName: 'Docs' }, theme: { defaultTheme: 'purple' } }`
        : basic
    const root = await fixture(t, source)
    await assert.rejects(
      addVersioning(root, {
        log: silent,
        env: {},
        install: async () => {
          if (failure === 'install') throw new Error('offline')
          await installStub(root, { invalid: failure === 'plugin' })
        },
      }),
      failure === 'install' ? /offline/ : /validation failed.*not changed/
    )
    assert.equal(
      await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
      source
    )
    assert.equal(
      (await readdir(root)).some(
        (name) => name.endsWith('.bak') || name.startsWith('rdx.config.add-')
      ),
      false
    )
  }
})

test('unsupported configuration is refused before installation; concurrent edits are not overwritten', async (t) => {
  const root = await fixture(t, `const config = {}; export default config`)
  await assert.rejects(
    addVersioning(root, { install: () => assert.fail('must not install') }),
    /Cannot safely edit/
  )
  await writeFile(path.join(root, 'rdx.config.ts'), basic)
  await assert.rejects(
    addVersioning(root, {
      log: silent,
      env: {},
      install: async () => {
        await installStub(root)
        await writeFile(
          path.join(root, 'rdx.config.ts'),
          '// User edited during install\n' + basic
        )
      },
    }),
    /changed during installation/
  )
  assert.match(
    await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
    /User edited/
  )
})

test('a linked configuration is never rewritten', async (t) => {
  const root = await fixture(t)
  const target = path.join(root, 'original.ts')
  await renameConfig(root, target)
  try {
    await symlink(target, path.join(root, 'rdx.config.ts'), 'file')
  } catch (error) {
    if (['EPERM', 'EACCES'].includes(error.code)) {
      t.skip('File symlinks require Windows Developer Mode')
      return
    }
    throw error
  }
  await assert.rejects(addVersioning(root), /regular project file/)
  assert.equal(await readFile(target, 'utf8'), basic)
})
async function renameConfig(root, target) {
  await writeFile(target, await readFile(path.join(root, 'rdx.config.ts')))
  await rm(path.join(root, 'rdx.config.ts'))
}

test('CLI rejects invalid arguments and unknown plugins before installation, and documents add', async (t) => {
  assert.deepEqual(parseAddArguments(['versioning']), {})
  assert.deepEqual(
    parseAddArguments(['versioning', '--package-manager', 'pnpm']),
    { packageManager: 'pnpm' }
  )
  const root = await fixture(t)
  for (const args of [
    [],
    ['other'],
    ['versioning', '--unknown'],
    ['versioning', '--package-manager', 'bun'],
    ['versioning', ';whoami'],
  ]) {
    const result = spawnSync(process.execPath, [cli, 'add', ...args], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /Usage: rdx add versioning/)
  }
  const help = spawnSync(process.execPath, [cli, '--help'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(help.status, 0)
  assert.match(help.stdout, /rdx add versioning/)
})

test('real CLI executes an offline installer through Node, activates the real plugin, prepares runtime and snapshots docs', async (t) => {
  const root = await fixture(t)
  await mkdir(path.join(root, 'docs/guides'), { recursive: true })
  await writeFile(path.join(root, 'docs/guides/intro.mdx'), '# Original docs')
  await writeFile(
    path.join(root, 'installer-fixture.json'),
    JSON.stringify({
      expectedArgs: expectedInstallArgs,
      pluginRoot: fileURLToPath(
        new URL('../../rdx-plugin-versioning', import.meta.url)
      ),
    })
  )
  const env = {
    ...process.env,
    npm_config_user_agent: 'npm/12.0.0',
    npm_execpath: fileURLToPath(
      new URL('./fixtures/package-manager.mjs', import.meta.url)
    ),
  }
  function run(...args) {
    return spawnSync(process.execPath, [cli, ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 30_000,
    })
  }
  const first = run('add', 'versioning')
  assert.equal(first.status, 0, first.stderr)
  assert.match(first.stdout, /runtime prepared/)
  assert.deepEqual(
    JSON.parse(await readFile(path.join(root, 'versions.json'), 'utf8')),
    { active: [], archived: [] }
  )
  assert.ok((await readdir(path.join(root, '.rdx'))).includes('rdx-project.ts'))
  const repeated = run('add', 'versioning')
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.match(repeated.stdout, /already configured/)
  assert.equal(
    await readFile(path.join(root, 'installer-calls.txt'), 'utf8'),
    'install\n'
  )
  const snapshot = run('version', '1.0.0')
  assert.equal(snapshot.status, 0, snapshot.stderr)
  assert.equal(
    await readFile(
      path.join(root, 'versioned_docs/version-1.0.0/guides/intro.mdx'),
      'utf8'
    ),
    '# Original docs'
  )
})

test('real CLI restores a missing declared plugin without changing its range or dependency section', async (t) => {
  const root = await fixture(t, activateVersioning(basic))
  const pluginRoot = fileURLToPath(
    new URL('../../rdx-plugin-versioning', import.meta.url)
  )
  const plugin = JSON.parse(
    await readFile(path.join(pluginRoot, 'package.json'), 'utf8')
  )
  const original = JSON.stringify(
    {
      name: 'fixture',
      private: true,
      type: 'module',
      devDependencies: { [versioningPackage]: `^${plugin.version}` },
    },
    null,
    2
  )
  await writeFile(path.join(root, 'package.json'), original)
  await writeFile(
    path.join(root, 'installer-fixture.json'),
    JSON.stringify({ pluginRoot, expectedArgs: ['install'] })
  )
  const result = spawnSync(process.execPath, [cli, 'add', 'versioning'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      npm_config_user_agent: 'npm/12',
      npm_execpath: fileURLToPath(
        new URL('./fixtures/package-manager.mjs', import.meta.url)
      ),
    },
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /Restoring the declared/)
  assert.match(result.stdout, /already configured/)
  assert.equal(
    await readFile(path.join(root, 'package.json'), 'utf8'),
    original
  )
  assert.equal(
    await readFile(path.join(root, 'rdx.config.ts'), 'utf8'),
    activateVersioning(basic)
  )
})

test('real CLI installer failure leaves the config and runtime untouched', async (t) => {
  const root = await fixture(t)
  await writeFile(
    path.join(root, 'installer-fixture.json'),
    JSON.stringify({ fail: true, expectedArgs: expectedInstallArgs })
  )
  const result = spawnSync(process.execPath, [cli, 'add', 'versioning'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      npm_config_user_agent: 'npm/12.0.0',
      npm_execpath: fileURLToPath(
        new URL('./fixtures/package-manager.mjs', import.meta.url)
      ),
    },
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /installation failed \(42\).*not changed/)
  assert.equal(await readFile(path.join(root, 'rdx.config.ts'), 'utf8'), basic)
  assert.equal((await readdir(root)).includes('.rdx'), false)
})
