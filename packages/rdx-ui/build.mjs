import assert from 'node:assert/strict'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

// Ship Mermaid's complete, upstream browser distribution. Consumers do not need
// its development files, source maps, declarations or Node dependency graph.
const require = createRequire(import.meta.url)
const upstream = path.dirname(require.resolve('mermaid/package.json'))
const source = path.join(upstream, 'dist')
const output = fileURLToPath(new URL('./dist/mermaid/', import.meta.url))
const entry = 'mermaid.esm.min.mjs'
const pending = [entry]
const visited = new Set()
const files = new Map()

while (pending.length) {
  const filename = pending.pop()
  if (visited.has(filename)) continue
  visited.add(filename)
  assert.ok(!filename.startsWith('..') && !path.isAbsolute(filename))
  assert.ok(filename.endsWith('.mjs'))
  const original = await readFile(path.join(source, filename), 'utf8')
  const tree = ts.createSourceFile(filename, original, ts.ScriptTarget.Latest)
  function visit(node) {
    let specifier
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      specifier = node.moduleSpecifier
    else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      assert.equal(node.arguments.length, 1)
      specifier = node.arguments[0]
    }
    if (specifier) {
      assert.ok(ts.isStringLiteral(specifier), 'Mermaid imports must be static')
      assert.ok(
        specifier.text.startsWith('.'),
        `External import: ${specifier.text}`
      )
      pending.push(
        path.normalize(path.join(path.dirname(filename), specifier.text))
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  // Preserve upstream code and license comments; omit unavailable source maps.
  files.set(filename, original.replace(/^\/\/# sourceMappingURL=.*$/gm, ''))
}

files.set('LICENSE', await readFile(path.join(upstream, 'LICENSE'), 'utf8'))
// This private boundary describes only the API used by RDX. Public RDX types
// stay independent of Mermaid's authoring and development dependencies.
files.set(
  'mermaid.esm.min.d.mts',
  `declare const mermaid: {
  initialize(config: Record<string, unknown>): void
  render(id: string, source: string, container?: Element): Promise<{ svg: string }>
}
export default mermaid
`
)
for (const [filename, contents] of files) {
  const target = path.join(output, filename)
  await mkdir(path.dirname(target), { recursive: true })
  // Avoid triggering Next's watcher when the upstream distribution is unchanged.
  const previous = await readFile(target, 'utf8').catch(() => undefined)
  if (previous !== contents) await writeFile(target, contents)
}
// A Mermaid upgrade can rename chunks. Remove obsolete generated modules.
for (const filename of await readdir(output, { recursive: true })) {
  if (/\.(?:mjs|mts|map)$/.test(filename) && !files.has(filename))
    await unlink(path.join(output, filename))
}
const manifest = JSON.parse(
  await readFile(path.join(upstream, 'package.json'), 'utf8')
)
console.log(
  `[rdx-ui] Prepared Mermaid ${manifest.version}: ${visited.size} browser modules.`
)
