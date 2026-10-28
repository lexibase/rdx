import assert from 'node:assert/strict'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { prepareProjectStyles } from '../bin/project-styles.mjs'

const base =
  "@import '@lexibase/rdx/styles.css';\n@source '../../docs/**/*.mdx';\n"
const css =
  ':root { --rdx-highlighting: #7c3aed; }\n.dark { --rdx-highlighting: #a78bfa; }\n'
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx styles-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const runtime = path.join(root, '.rdx')
  const destination = path.join(runtime, 'app/globals.css')
  const source = path.join(root, 'rdx.css')
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, base)
  return { root, runtime, source, destination }
}
test('optional project CSS is imported after the theme, kept in place and prepared idempotently', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  await prepareProjectStyles(root, runtime)
  assert.equal(await readFile(destination, 'utf8'), base)
  await assert.rejects(access(source))
  await writeFile(source, css)
  await prepareProjectStyles(root, runtime)
  await prepareProjectStyles(root, runtime)
  assert.equal(
    await readFile(destination, 'utf8'),
    base.replace(';\n', ';\n@import "../../rdx.css";\n')
  )
  assert.equal(await readFile(source, 'utf8'), css)
  await unlink(source)
  await prepareProjectStyles(root, runtime)
  assert.equal(await readFile(destination, 'utf8'), base)
})
test('preparation reflects CSS creation, removal and replacement without copying contents', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  async function expectImport(present) {
    await prepareProjectStyles(root, runtime)
    assert.equal(
      (await readFile(destination, 'utf8')).includes('@import "../../rdx.css"'),
      present
    )
  }
  await writeFile(source, css)
  await expectImport(true)
  await writeFile(source, '/* updated */\n' + css)
  await expectImport(true)
  assert.equal(await readFile(source, 'utf8'), '/* updated */\n' + css)
  await rename(source, source + '.moved')
  await expectImport(false)
  await rename(source + '.moved', source)
  await expectImport(true)
  await unlink(source)
  await expectImport(false)
})
test('a directory at rdx.css fails without rewriting the stylesheet or its source', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  await mkdir(source)
  await writeFile(path.join(source, 'keep.txt'), 'preserved')
  await assert.rejects(
    prepareProjectStyles(root, runtime),
    /rdx.css must be a CSS file/
  )
  assert.equal(await readFile(destination, 'utf8'), base)
  assert.equal(
    await readFile(path.join(source, 'keep.txt'), 'utf8'),
    'preserved'
  )
})
