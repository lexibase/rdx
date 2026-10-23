import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

const require = createRequire(import.meta.url)
const tsup = require.resolve('tsup/dist/cli-default.js')

for (const name of ['rdx-core', 'rdx-next', 'rdx-plugin-versioning']) {
  test(
    `${name} development command rebuilds JavaScript and declarations after source changes`,
    { timeout: 60_000 },
    async () => {
      const pkg = JSON.parse(
        await readFile(
          new URL(`../../packages/${name}/package.json`, import.meta.url),
          'utf8'
        )
      )
      const args = pkg.scripts.dev.split(' ').slice(1)
      assert.ok(args.includes('--watch'))
      assert.ok(!args.includes('--clean'))
      const root = await mkdtemp(path.join(os.tmpdir(), `rdx-${name}-watch-`))
      let child
      let closed
      let logs = ''
      async function until(check) {
        const deadline = Date.now() + 20_000
        while (Date.now() < deadline) {
          assert.equal(child.exitCode, null, logs)
          if (await check()) return
          await delay(100)
        }
        assert.fail(`Package watcher timed out: ${logs}`)
      }
      async function hasMarker(file, marker) {
        return readFile(path.join(root, 'dist', file), 'utf8').then(
          (text) => text.includes(marker),
          () => false
        )
      }
      try {
        await writeFile(path.join(root, 'package.json'), '{"type":"module"}')
        await writeFile(
          path.join(root, 'tsconfig.json'),
          JSON.stringify({
            compilerOptions: {
              module: 'ESNext',
              moduleResolution: 'Bundler',
              target: 'ES2022',
            },
          })
        )
        await mkdir(path.join(root, 'node_modules'))
        await symlink(
          path.dirname(require.resolve('typescript/package.json')),
          path.join(root, 'node_modules/typescript'),
          process.platform === 'win32' ? 'junction' : 'dir'
        )
        for (const entry of args.filter((argument) =>
          /^src\/.+\.tsx?$/.test(argument)
        )) {
          const filename = path.join(root, entry)
          await mkdir(path.dirname(filename), { recursive: true })
          await writeFile(
            filename,
            'export const developmentMarker = "RDX_BEFORE"\n'
          )
        }
        child = spawn(process.execPath, [tsup, ...args], {
          cwd: root,
          windowsHide: true,
          detached: process.platform !== 'win32',
        })
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
        await until(
          async () =>
            logs.includes('Watching for changes') &&
            (await hasMarker('index.d.ts', 'RDX_BEFORE'))
        )
        await writeFile(
          path.join(root, 'src/index.ts'),
          'export const developmentMarker = "RDX_AFTER"\n'
        )
        await until(
          async () =>
            (await hasMarker('index.js', 'RDX_AFTER')) &&
            (await hasMarker('index.d.ts', 'RDX_AFTER'))
        )
      } finally {
        if (child && child.exitCode === null) {
          if (process.platform === 'win32')
            spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
              windowsHide: true,
              timeout: 10_000,
            })
          else process.kill(-child.pid, 'SIGTERM')
        }
        if (closed) await closed
        await rm(root, { recursive: true, force: true })
      }
    }
  )
}
