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

const { pluginRoot, fail, expectedArgs } = JSON.parse(
  await readFile('installer-fixture.json', 'utf8')
)
assert.deepEqual(process.argv.slice(2), expectedArgs)
await appendFile('installer-calls.txt', 'install\n')
if (fail) process.exit(42)
const plugin = JSON.parse(
  await readFile(path.join(pluginRoot, 'package.json'), 'utf8')
)
const location = path.resolve('node_modules', plugin.name)
await mkdir(path.dirname(location), { recursive: true })
await symlink(
  pluginRoot,
  location,
  process.platform === 'win32' ? 'junction' : 'dir'
)
const pkg = JSON.parse(await readFile('package.json', 'utf8'))
if (expectedArgs.length > 1) {
  pkg.dependencies = {
    ...pkg.dependencies,
    [plugin.name]: plugin.version,
  }
  await writeFile('package.json', JSON.stringify(pkg, null, 2))
}
