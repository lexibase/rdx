import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { getRdxTracingConfig } from '@lexibase/rdx-next/config'

const root = fileURLToPath(new URL('../', import.meta.url))

test('production traces contain configured content without copying the showcase source tree', async () => {
  const tracing = await getRdxTracingConfig({ rootDir: root })
  const expected = tracing.outputFileTracingIncludes['/*']
  assert.ok(expected.includes('versions.json'))
  assert.ok(expected.some((file) => file.startsWith('docs/')))
  assert.equal(
    expected.some((file) => file.startsWith('versioned_docs/')),
    true
  )
  for (const route of [
    'docs/[version]/page.js',
    'docs/[version]/[...doc]/page.js',
  ]) {
    const filename = path.join(root, '.next/server/app', `${route}.nft.json`)
    const trace = JSON.parse(await readFile(filename, 'utf8'))
    const files = new Set(
      trace.files.map((file) => path.resolve(path.dirname(filename), file))
    )
    for (const file of expected)
      assert.ok(files.has(path.resolve(root, file)), `${route}: ${file}`)
    for (const file of [
      'README.md',
      'rdx.config.ts',
      'next.config.js',
      'app/layout.tsx',
      'lib/docs.ts',
      'scripts/project.ts',
      'tests/documentation.test.mjs',
      'tests/version-browser.integration.mjs',
      '.env.local',
    ]) {
      assert.equal(
        files.has(path.resolve(root, file)),
        false,
        `${route} must not include ${file}`
      )
    }
  }
})
