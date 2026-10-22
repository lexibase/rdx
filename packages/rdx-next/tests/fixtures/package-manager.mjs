// Offline package-manager fixture: never contacts a registry.
import assert from 'node:assert/strict'
import {
  appendFile,
  mkdir,
  readFile,
  writeFile,
  symlink,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

assert.deepEqual(process.argv.slice(2), [
  'install',
  '@lexibase/rdx-versioning@beta',
])
await appendFile('installer-calls.txt', 'install\n')
const { pluginRoot, fail } = JSON.parse(
  await readFile('installer-fixture.json', 'utf8')
)
if (fail) process.exit(42)
const location = path.resolve('node_modules/@lexibase/rdx-versioning')
await mkdir(path.dirname(location), { recursive: true })
await symlink(
  pluginRoot,
  location,
  process.platform === 'win32' ? 'junction' : 'dir'
)
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
pkg.dependencies = {
  ...pkg.dependencies,
  '@lexibase/rdx-versioning': '1.0.0-beta.2',
}
await writeFile('package.json', JSON.stringify(pkg, null, 2))
