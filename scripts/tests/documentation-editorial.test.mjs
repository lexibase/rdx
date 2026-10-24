import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (name) => readFile(path.join(root, name), 'utf8')

async function documents(directory) {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  })
  const nested = await Promise.all(
    entries.map((entry) => {
      const name = path.join(directory, entry.name)
      if (entry.isDirectory()) return documents(name)
      return /\.mdx?$/.test(entry.name) ? [name] : []
    })
  )
  return nested.flat()
}

test('reader guides and starter examples describe available features without development-history notices', async () => {
  const files = [
    ...(await documents('apps/web/docs')),
    ...(await documents('packages/create-rdx/templates/default')),
    'CONFIGURATION.md',
    'MDX.md',
    'SEARCH.md',
    'packages/create-rdx/README.md',
    'packages/rdx-next/README.md',
    'packages/rdx-ui/README.md',
  ]
  // Target retired editorial patterns, not useful operational/safety limitations.
  const internalNarrative =
    /planned separately|separate future work|in future releases|\(soon\)|there is no `docsDir` option|remove `docsDir` from older|root `title` option has been removed|first-release documentation|before stable release|this beta changes/gi
  for (const filename of files) {
    assert.doesNotMatch(await read(filename), internalNarrative, filename)
  }
})

test('documentation licensing distinguishes official prose from MIT code and user-owned content', async () => {
  const notice = await read('LICENSE-docs')
  assert.match(notice, /apps\/web\/docs\/\*\*\/\*\.mdx/)
  assert.match(notice, /repository-root Markdown documentation/)
  assert.match(
    notice,
    /https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/legalcode/
  )
  assert.match(notice, /CLI starter templates[\s\S]*remain MIT licensed/)
  assert.match(notice, /using RDX does not select a license/)
  assert.match(await read('LICENSE'), /The MIT License/)
  for (const filename of ['README.md', 'apps/web/docs/cat-01/license.mdx']) {
    const text = await read(filename)
    assert.match(text, /CC BY 4\.0/)
    assert.match(text, /LICENSE-docs/)
    assert.match(text, /MIT/)
  }
  for (const directory of [
    'rdx-types',
    'rdx-core',
    'rdx-ui',
    'rdx-next',
    'rdx-plugin-versioning',
    'create-rdx',
  ]) {
    const pkg = JSON.parse(await read(`packages/${directory}/package.json`))
    assert.equal(pkg.license, 'MIT', directory)
  }
})
