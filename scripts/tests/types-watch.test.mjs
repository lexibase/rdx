import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

test(
  'local declarations watch handles edits, additions and removals without manual builds',
  { timeout: 30_000 },
  async () => {
    const fixture = await mkdtemp(path.join(os.tmpdir(), 'rdx-types-watch-'))
    let child
    let closed
    let logs = ''
    async function until(check) {
      const deadline = Date.now() + 10_000
      while (Date.now() < deadline) {
        assert.equal(child.exitCode, null, logs)
        if (await check()) return
        await delay(50)
      }
      assert.fail(`Declaration watcher timed out: ${logs}`)
    }
    async function output(name) {
      return readFile(path.join(fixture, 'dist', name), 'utf8').catch(
        () => null
      )
    }
    try {
      await mkdir(path.join(fixture, 'src'))
      await writeFile(
        path.join(fixture, 'src/index.d.ts'),
        'export type Label = "before"\n'
      )
      await cp(
        new URL('../../packages/rdx-types/build.mjs', import.meta.url),
        path.join(fixture, 'build.mjs')
      )
      child = spawn(
        process.execPath,
        [path.join(fixture, 'build.mjs'), '--watch'],
        { cwd: fixture, windowsHide: true }
      )
      closed = new Promise((resolve) => child.once('close', resolve))
      child.on('error', (error) => {
        logs += error.message
      })
      child.stdout.on('data', (data) => {
        logs += data
      })
      child.stderr.on('data', (data) => {
        logs += data
      })
      await until(() => logs.includes('Watching local declarations'))
      assert.equal(await output('index.d.ts'), 'export type Label = "before"\n')
      await writeFile(
        path.join(fixture, 'src/index.d.ts'),
        'export type Label = "after"\n'
      )
      await until(async () => (await output('index.d.ts'))?.includes('after'))
      await mkdir(path.join(fixture, 'src/nested'))
      await writeFile(
        path.join(fixture, 'src/nested/extra.d.ts'),
        'export type Extra = true\n'
      )
      await until(async () =>
        (await output('nested/extra.d.ts'))?.includes('Extra')
      )
      await rm(path.join(fixture, 'src/nested'), { recursive: true })
      await until(async () => (await output('nested/extra.d.ts')) === null)
      assert.match(
        await readFile(path.join(fixture, 'src/index.d.ts'), 'utf8'),
        /after/
      )
    } finally {
      if (child && child.exitCode === null) child.kill()
      if (closed) await closed
      await rm(fixture, { recursive: true, force: true })
    }
  }
)
