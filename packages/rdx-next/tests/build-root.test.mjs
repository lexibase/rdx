import assert from 'node:assert/strict'
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import test from 'node:test'

import { getRdxBuildRoot } from '../config.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-build-root-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

async function nextPackage(root) {
  await mkdir(root, { recursive: true })
  await writeFile(
    path.join(root, 'package.json'),
    '{"name":"next","version":"16.4.3"}'
  )
}

test('standalone installations keep the documentation project as the build root', async (t) => {
  const root = await fixture(t)
  await nextPackage(path.join(root, 'node_modules/next'))
  assert.equal(await getRdxBuildRoot(root), await realpath(root))
})

test('pnpm workspaces include the real dependency store despite a nested lockfile and no Turborepo', async (t) => {
  const root = await fixture(t)
  const project = path.join(root, 'apps/web')
  const installed = path.join(
    root,
    'node_modules/.pnpm/next@16.4.3/node_modules/next'
  )
  await nextPackage(installed)
  await mkdir(path.join(project, 'node_modules'), { recursive: true })
  await writeFile(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages:\n  - apps/*\n'
  )
  await writeFile(
    path.join(project, 'pnpm-lock.yaml'),
    'lockfileVersion: 9.0\n'
  )
  const pointer = path.join(project, 'node_modules/next')
  await symlink(
    installed,
    pointer,
    process.platform === 'win32' ? 'junction' : 'dir'
  )
  t.after(() => rm(pointer, { force: true }))
  assert.equal(await getRdxBuildRoot(project), await realpath(root))
})

test('ancestor-hoisted dependencies are included without requiring a workspace tool', async (t) => {
  const root = await fixture(t)
  const project = path.join(root, 'apps/web')
  await mkdir(project, { recursive: true })
  await nextPackage(path.join(root, 'node_modules/next'))
  assert.equal(await getRdxBuildRoot(project), await realpath(root))
})
