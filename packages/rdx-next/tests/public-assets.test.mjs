import assert from 'node:assert/strict'
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'

import { preparePublicAssets } from '../bin/public-assets.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-public-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const runtime = path.join(root, '.rdx')
  await mkdir(runtime)
  return {
    root,
    runtime,
    source: path.join(root, 'public'),
    destination: path.join(runtime, 'public'),
  }
}

const directoryLink = (target, destination) =>
  symlink(
    target,
    destination,
    process.platform === 'win32' ? 'junction' : 'dir'
  )

test('missing public directory is created and repeated preparation preserves the link', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  await preparePublicAssets(root, runtime)
  assert.ok((await lstat(source)).isDirectory())
  assert.ok((await lstat(destination)).isSymbolicLink())
  assert.equal(await realpath(destination), await realpath(source))
  await writeFile(path.join(source, 'keep.txt'), 'original')
  await preparePublicAssets(root, runtime)
  assert.equal(
    await readFile(path.join(destination, 'keep.txt'), 'utf8'),
    'original'
  )
})

test('asset additions, edits and removals are visible without recopying or touching originals', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  await preparePublicAssets(root, runtime)
  await mkdir(path.join(source, 'images with spaces'))
  const asset = path.join(source, 'images with spaces', 'ação.svg')
  const generated = path.join(destination, 'images with spaces', 'ação.svg')
  await writeFile(asset, 'first')
  assert.equal(await readFile(generated, 'utf8'), 'first')
  await writeFile(asset, 'updated')
  assert.equal(await readFile(generated, 'utf8'), 'updated')
  await unlink(asset)
  await assert.rejects(access(generated))
})

test('conflicting generated public directories and files are preserved with an actionable error', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  await mkdir(source)
  await writeFile(path.join(source, 'original.txt'), 'project asset')
  await mkdir(destination)
  await writeFile(path.join(destination, 'keep.txt'), 'do not remove')
  await assert.rejects(preparePublicAssets(root, runtime), /Move any assets/)
  assert.equal(
    await readFile(path.join(destination, 'keep.txt'), 'utf8'),
    'do not remove'
  )
  assert.equal(
    await readFile(path.join(source, 'original.txt'), 'utf8'),
    'project asset'
  )
  await rm(destination, { recursive: true })
  await writeFile(destination, 'also preserve files')
  await assert.rejects(preparePublicAssets(root, runtime), /Move any assets/)
  assert.equal(await readFile(destination, 'utf8'), 'also preserve files')
})

test('repointing an internal link never removes its previous target', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  const old = path.join(root, 'previous assets')
  await mkdir(old)
  await writeFile(path.join(old, 'sentinel.txt'), 'preserved')
  await directoryLink(old, destination)
  await preparePublicAssets(root, runtime)
  assert.equal(await realpath(destination), await realpath(source))
  assert.equal(
    await readFile(path.join(old, 'sentinel.txt'), 'utf8'),
    'preserved'
  )
})

test('a broken internal pointer is repaired after a project move', async (t) => {
  const { root, runtime, source, destination } = await fixture(t)
  const old = path.join(root, 'moved-away')
  await mkdir(old)
  await directoryLink(old, destination)
  await rm(old, { recursive: true })
  await preparePublicAssets(root, runtime)
  assert.equal(await realpath(destination), await realpath(source))
})

test('public source files or links and redirected runtime roots fail without altering their targets', async (t) => {
  const { root, runtime, source } = await fixture(t)
  await writeFile(source, 'preserve this file')
  await assert.rejects(
    preparePublicAssets(root, runtime),
    /public\/ must be a real directory/
  )
  assert.equal(await readFile(source, 'utf8'), 'preserve this file')
  await unlink(source)
  const outside = path.join(root, 'unrelated')
  await mkdir(outside)
  await writeFile(path.join(outside, 'sentinel.txt'), 'preserved')
  await directoryLink(outside, source)
  await assert.rejects(
    preparePublicAssets(root, runtime),
    /public\/ must be a real directory/
  )
  await unlink(source)
  await rm(runtime, { recursive: true })
  await directoryLink(outside, runtime)
  await assert.rejects(
    preparePublicAssets(root, runtime),
    /\.rdx\/ must be a real directory/
  )
  assert.equal(
    await readFile(path.join(outside, 'sentinel.txt'), 'utf8'),
    'preserved'
  )
})
