import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  assertCompatibleUi,
  prepareRelease,
  promoteChangelog,
  releaseOrder,
} from '../prepare-release.mjs'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)
const cli = require.resolve('@changesets/cli/bin.js')
// These scenario versions are fixed test data, not the repository's next release.
const fixtureVersions = {
  'rdx-types': '2.2.0',
  'rdx-core': '2.2.0',
  'rdx-ui': '3.4.0',
  'rdx-plugin-versioning': '1.3.1',
  'rdx-plugin-i18n': '1.0.1',
  'rdx-next': '4.2.0',
  rdx: '4.2.0',
  'create-rdx': '4.2.0',
}
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const put = async (root, file, value) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true })
  await writeFile(
    path.join(root, file),
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'
  )
}
async function fixture(t, bump = 'minor') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-release-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  // Borrow local Git objects for Changesets' status calculation. No commits,
  // tags, remote requests or changes to the real repository are made.
  execFileSync('git', ['clone', '--shared', '--no-checkout', repo, root], {
    stdio: 'pipe',
  })
  await put(root, 'package.json', {
    name: 'release-test',
    private: true,
    packageManager: 'pnpm@9.0.0',
  })
  await put(root, 'pnpm-workspace.yaml', "packages:\n  - 'packages/*'\n")
  await put(root, '.changeset/config.json', {
    ...(await json(path.join(repo, '.changeset/config.json'))),
    baseBranch: 'HEAD',
  })
  await put(
    root,
    '.changeset/feature.md',
    `---\n"@lexibase/rdx": ${bump}\n---\n\nAdd a compatible documentation feature.\n`
  )
  for (const directory of releaseOrder) {
    const pkg = await json(
      path.join(repo, 'packages', directory, 'package.json')
    )
    const dependencies = Object.fromEntries(
      Object.entries(pkg.dependencies || {}).filter(([name]) =>
        name.startsWith('@lexibase/')
      )
    )
    await put(root, `packages/${directory}/package.json`, {
      name: pkg.name,
      version: fixtureVersions[directory],
      dependencies,
      ...(directory === 'rdx-next'
        ? { peerDependencies: { '@lexibase/rdx-ui': '^3.4.0' } }
        : {}),
    })
  }
  await put(root, 'packages/create-rdx/templates/default/package.json', {
    name: 'my-docs',
    dependencies: { '@lexibase/rdx': '4.2.0' },
  })
  await put(root, 'apps/web/versions.json', {
    active: ['4.2.0'],
    archived: [],
    redirects: {},
  })
  await put(
    root,
    'CHANGELOG.md',
    '# Changelog\n\n## Unreleased\n\n## 4.2.0\n\nPrevious release.\n'
  )
  await put(
    root,
    'PUBLIC_API.md',
    '# RDX public API — 4.2\n\nThe public API of RDX 4.2.\n\n<!-- rdx:packages:start -->\nOld table\n<!-- rdx:packages:end -->\n'
  )
  await put(
    root,
    'PUBLISHING.md',
    '# Publishing\n\n## Prepared grouped release: RDX 4.2.0\n\nOld plan.\n'
  )
  const calls = []
  const run = async (tool, args, cwd) => {
    calls.push([tool, ...args])
    if (tool === 'changeset') {
      try {
        execFileSync(process.execPath, [cli, ...args], {
          cwd,
          stdio: 'pipe',
          timeout: 20000,
        })
      } catch (error) {
        throw new Error(`${error.stdout}\n${error.stderr}`)
      }
    } else if (args.includes('docs:version')) {
      const version = args.at(-1)
      await put(
        root,
        `apps/web/versioned_docs/version-${version}/intro.mdx`,
        'Snapshot fixture.\n'
      )
      await put(root, 'apps/web/versions.json', {
        active: [version],
        archived: [],
        redirects: { '4.2.0': version },
      })
    }
  }
  return { root, calls, run }
}

test('a real Changesets preview preserves files and preparation updates only the planned packages', async (t) => {
  const { root, calls, run } = await fixture(t)
  const read = (file) => readFile(path.join(root, file), 'utf8')
  const before = await read('packages/rdx/package.json')
  const plan = await prepareRelease(root, { dryRun: true, run, log: () => {} })
  assert.equal(
    plan.releases.find((item) => item.name === '@lexibase/rdx').newVersion,
    '4.3.0'
  )
  assert.equal(await read('packages/rdx/package.json'), before)
  assert.equal(
    (await readdir(path.join(root, '.changeset'))).includes('feature.md'),
    true
  )
  assert.equal(calls.length, 1)
  await prepareRelease(root, { run, log: () => {} })
  assert.equal(
    (await json(path.join(root, 'packages/create-rdx/package.json'))).version,
    '4.3.0'
  )
  assert.equal(
    (await json(path.join(root, 'packages/rdx/package.json'))).version,
    '4.3.0'
  )
  assert.equal(
    (await json(path.join(root, 'packages/rdx-next/package.json'))).version,
    '4.2.0'
  )
  assert.equal(
    (
      await json(
        path.join(root, 'packages/create-rdx/templates/default/package.json')
      )
    ).dependencies['@lexibase/rdx'],
    '4.3.0'
  )
  assert.match(
    await read('CHANGELOG.md'),
    /## 4.3.0 — Prepared[\s\S]*Add a compatible/
  )
  const publishing = await read('PUBLISHING.md')
  assert.match(publishing, /## Prepared grouped release: RDX 4.3.0/)
  const commands = publishing.match(/^pnpm --filter.*publish.*$/gm)
  assert.equal(commands.length, 2)
  assert.ok(commands[0].includes('@lexibase/rdx publish'))
  assert.ok(commands[1].includes('@lexibase/create-rdx publish'))
  assert.match(await read('PUBLIC_API.md'), /# RDX public API — 4.3/)
  assert.ok(calls.some((call) => call.includes('--offline')))
  assert.ok(
    calls.some(
      (call) => call.includes('docs:version') && call.at(-1) === '4.3.0'
    )
  )
  assert.ok(
    calls.every(
      (call) =>
        !call.some((arg) =>
          [
            'publish',
            'push',
            'commit',
            'tag',
            'check',
            'test:release',
          ].includes(arg)
        )
    )
  )
  assert.equal(await prepareRelease(root, { run, log: () => {} }), null)
})

test('preflight rejects existing snapshots and non-advancing editions before consuming notes', async (t) => {
  const { root, calls, run } = await fixture(t, 'patch')
  await put(
    root,
    'apps/web/versioned_docs/version-4.2.1/owned.txt',
    'Keep this file'
  )
  await assert.rejects(prepareRelease(root, { run, log: () => {} }))
  assert.ok(calls.every((call) => call[1] === 'status'))
  assert.equal(
    (await json(path.join(root, 'packages/rdx/package.json'))).version,
    '4.2.0'
  )
  assert.match(
    await readFile(path.join(root, '.changeset/feature.md'), 'utf8'),
    /documentation feature/
  )
  assert.equal(
    await readFile(
      path.join(root, 'apps/web/versioned_docs/version-4.2.1/owned.txt'),
      'utf8'
    ),
    'Keep this file'
  )
  await put(root, 'apps/web/versions.json', {
    active: ['4.9.0'],
    archived: [],
    redirects: {},
  })
  await assert.rejects(
    prepareRelease(root, { dryRun: true, run, log: () => {} }),
    /advance/
  )
})

test('a compatible UI minor keeps independent packages and does not force a runtime major', async (t) => {
  const { root, run } = await fixture(t)
  await put(
    root,
    '.changeset/feature.md',
    '---\n"@lexibase/rdx-ui": minor\n---\n\nAdd a documentation component.\n'
  )
  const plan = await prepareRelease(root, { dryRun: true, run, log: () => {} })
  assert.equal(
    plan.releases.find((item) => item.name === '@lexibase/rdx-ui').newVersion,
    '3.5.0'
  )
  assert.equal(
    plan.releases.find((item) => item.name === '@lexibase/rdx').newVersion,
    '4.2.1'
  )
  assert.equal(
    plan.releases.find((item) => item.name === '@lexibase/create-rdx')
      .newVersion,
    '4.2.1'
  )
  assert.equal(
    plan.releases.find((item) => item.name === '@lexibase/rdx-next'),
    undefined
  )
})

test('changelog promotion preserves history and authored notes, and UI compatibility is version-independent', () => {
  const source =
    '# Changelog\n\n## Unreleased\n\n- Authored summary.\n\n## 4.2.0\n\nOld notes.\n'
  const result = promoteChangelog(source, '4.2.1', ['Fallback summary'])
  assert.match(result, /Authored summary/)
  assert.match(result, /## 4.2.0\n\nOld notes/)
  assert.doesNotMatch(result, /Fallback summary/)
  assert.throws(() => promoteChangelog(result, '4.2.1', ['Duplicate']))
  assertCompatibleUi('^3.4.0', '3.5.0')
  assert.throws(() => assertCompatibleUi('^3.4.0', '3.3.0'))
  assert.throws(() => assertCompatibleUi('^3.4.0', '4.0.0'))
})
