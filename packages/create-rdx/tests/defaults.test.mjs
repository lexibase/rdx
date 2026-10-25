import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtemp,
  readFile,
  access,
  rm,
  mkdir,
  writeFile,
  symlink,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import ts from 'typescript'

const cli = fileURLToPath(new URL('../bin/index.js', import.meta.url))

test('generated components and config typecheck independently of a NodeNext parent project', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-project-types-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(
    path.join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext' },
    })
  )
  const result = spawnSync(process.execPath, [cli, 'web', '--skip-install'], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const project = path.join(root, 'web')
  const require = createRequire(
    new URL('../../rdx-ui/package.json', import.meta.url)
  )
  for (const [name, target] of [
    ['react', path.dirname(require.resolve('react/package.json'))],
    [
      '@types/react',
      path.dirname(require.resolve('@types/react/package.json')),
    ],
    ['@types/node', path.dirname(require.resolve('@types/node/package.json'))],
    ['@lexibase/rdx', fileURLToPath(new URL('../../rdx', import.meta.url))],
  ]) {
    const destination = path.join(project, 'node_modules', name)
    await mkdir(path.dirname(destination), { recursive: true })
    await symlink(
      target,
      destination,
      process.platform === 'win32' ? 'junction' : 'dir'
    )
  }
  await mkdir(path.join(project, 'components'))
  await writeFile(
    path.join(project, 'components/logo.tsx'),
    `
export function Logo({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" className={className} />
}
`
  )
  const configPath = path.join(project, 'rdx.config.ts')
  const config = await readFile(configPath, 'utf8')
  await writeFile(
    configPath,
    config
      .replace(
        "import { defineConfig } from '@lexibase/rdx'",
        "import { defineConfig } from '@lexibase/rdx'\nimport { Logo } from './components/logo'\nimport MyHome from './components/home'"
      )
      .replace("title: '',", "title: '', logo: Logo,")
      .replace('enabled: false', 'enabled: true, component: MyHome')
  )
  await writeFile(
    path.join(project, 'components/home.tsx'),
    'import { Logo } from \'./logo\'\nexport default function Home() { return <Logo className="size-5" /> }\n'
  )
  const filename = ts.findConfigFile(
    path.join(project, 'components'),
    ts.sys.fileExists
  )
  assert.equal(path.resolve(filename), path.join(project, 'tsconfig.json'))
  const read = ts.readConfigFile(filename, ts.sys.readFile)
  assert.equal(read.error, undefined)
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    project,
    undefined,
    filename
  )
  assert.deepEqual(parsed.errors, [])
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.deepEqual(
    diagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    ),
    []
  )
})

test('generated projects expose homepage and navbar defaults without activating plugins', async (t) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'rdx-defaults-'))
  t.after(() => rm(rootDir, { recursive: true, force: true }))
  const result = spawnSync(
    process.execPath,
    [cli, 'rdx-defaults', '--skip-install'],
    { cwd: rootDir, encoding: 'utf8' }
  )
  assert.equal(result.status, 0, result.stderr)
  const projectDir = path.join(rootDir, 'rdx-defaults')
  const config = await readFile(path.join(projectDir, 'rdx.config.ts'), 'utf8')
  assert.match(config, /navbar:\s*\{\s*title:\s*''/)
  assert.match(config, /github:\s*\{\s*visible:\s*true,\s*url:\s*'#'/)
  assert.match(config, /showToggleMode:\s*true/)
  assert.match(config, /homepage:\s*\{\s*enabled:\s*false/)
  assert.match(config, /TOC:\s*false/)
  assert.match(config, /search:\s*false/)
  assert.match(config, /metadata:\s*\{/)
  assert.match(config, /applicationName:\s*'My documentation'/)
  assert.doesNotMatch(config, /^  title:/m)
  assert.doesNotMatch(config, /metadataBase:\s*['"]/)
  assert.doesNotMatch(config, /plugins\s*:/)
  assert.doesNotMatch(config, /docsDir/)
  await access(path.join(projectDir, 'docs/init/intro.mdx'))
  await access(path.join(projectDir, '.gitignore'))
  await access(path.join(projectDir, 'public/images/rdx.svg'))
  await access(path.join(projectDir, 'public/downloads/example.txt'))
  await access(path.join(projectDir, 'docs/examples/images.mdx'))
  await assert.rejects(access(path.join(projectDir, 'versions.json')))
  const pkg = JSON.parse(
    await readFile(path.join(projectDir, 'package.json'), 'utf8')
  )
  assert.equal(pkg.name, 'rdx-defaults')
  assert.match(
    await readFile(path.join(projectDir, 'README.md'), 'utf8'),
    /^# rdx-defaults\r?\n/
  )
  assert.ok(pkg.dependencies['@lexibase/rdx'])
  assert.equal(pkg.dependencies['@lexibase/rdx-next'], undefined)
  assert.equal(pkg.dependencies['@lexibase/rdx-ui'], undefined)
  assert.match(config, /from '@lexibase\/rdx'/)
  assert.match(config, new RegExp(`since: ${new Date().getFullYear()},`))
  assert.doesNotMatch(config, /since: new Date/)
  for (const [name, directory] of [['@lexibase/rdx', 'rdx']]) {
    const release = JSON.parse(
      await readFile(
        new URL(`../../${directory}/package.json`, import.meta.url),
        'utf8'
      )
    )
    assert.equal(
      pkg.dependencies[name],
      release.version,
      `The starter must require the exact tested ${name} release`
    )
  }
  assert.equal(pkg.dependencies['@lexibase/rdx-versioning'], undefined)
  assert.equal(pkg.dependencies.next, '^16.4.2')
  assert.equal(pkg.dependencies.react, '19.3.1')
  assert.equal(pkg.dependencies['react-dom'], pkg.dependencies.react)
  assert.equal(pkg.devDependencies['@types/react'], '19.3.0')
  assert.equal(pkg.devDependencies.typescript, '6.0.3')
  assert.equal(pkg.engines.node, '^22.18.0 || ^24.11.0')
})
