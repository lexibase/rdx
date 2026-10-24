import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const core = fileURLToPath(
  new URL('../../rdx-core/dist/index.js', import.meta.url)
)
const template = new URL('../templates/runtime/rdx-project.ts', import.meta.url)
const plugin = new URL(
  '../../rdx-plugin-versioning/dist/index.js',
  import.meta.url
).href

test('generated project resolves content from the CLI root and internal Next/serverless working directory', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-runtime-root-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(path.join(root, '.rdx'))
  await cp(template, path.join(root, '.rdx/rdx-project.ts'))
  await mkdir(path.join(root, 'docs/guides'), { recursive: true })
  await writeFile(
    path.join(root, 'docs/guides/intro.mdx'),
    'Current fixture body'
  )
  await mkdir(path.join(root, 'snapshots/version-1.0.0/guides'), {
    recursive: true,
  })
  await writeFile(
    path.join(root, 'snapshots/version-1.0.0/guides/intro.mdx'),
    'Snapshot fixture body'
  )
  await mkdir(path.join(root, 'metadata'))
  await writeFile(
    path.join(root, 'metadata/editions.json'),
    JSON.stringify({ active: ['1.0.0'], archived: [] })
  )
  for (const versioned of [false, true]) {
    await writeFile(
      path.join(root, 'rdx.config.ts'),
      `${versioned ? `import { versioning } from '${plugin}'` : ''}
      export default { metadata: { applicationName: 'Fixture' }, plugins: [${versioned ? "versioning({ versionsFile: 'metadata/editions.json', versionsDir: 'snapshots' })" : ''}] }`
    )
    for (const cwd of [root, path.join(root, '.rdx')]) {
      const script = `import { createJiti } from ${JSON.stringify(pathToFileURL(require.resolve('jiti')).href)};
        const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false,
          alias: { '@lexibase/rdx-next/runtime': ${JSON.stringify(core)} } });
        const { getProject } = await jiti.import(${JSON.stringify(path.join(root, '.rdx/rdx-project.ts'))});
        const { resolveDocsRoute } = await jiti.import(${JSON.stringify(core)});
        const project = await getProject();
        console.log(JSON.stringify({root: project.rootDir,
          current: resolveDocsRoute(project, ['guides','intro']).document?.content,
          snapshot: resolveDocsRoute(project, ['1.0.0','guides','intro']).document?.content }));`
      const result = JSON.parse(
        execFileSync(process.execPath, ['--input-type=module', '-e', script], {
          cwd,
          encoding: 'utf8',
        })
      )
      assert.equal(result.root, root)
      assert.equal(result.current, 'Current fixture body')
      assert.equal(
        result.snapshot,
        versioned ? 'Snapshot fixture body' : undefined
      )
    }
  }
  await assert.rejects(
    readFile(path.join(root, '.rdx/metadata/editions.json')),
    /ENOENT/
  )
})
