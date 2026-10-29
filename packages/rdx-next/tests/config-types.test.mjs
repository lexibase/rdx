import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = fileURLToPath(new URL('../', import.meta.url))

test('published configuration exports share RDXConfig and retain nested editor documentation', () => {
  // Compile an in-memory consumer against the built declarations, not TS sources.
  const filename = path.join(root, 'tests/config-contract-consumer.ts')
  const source = `
    import type { RDXConfig as Shared, RdxRuntimeConfig } from '@lexibase/rdx-types'
    import { defineConfig, type RDXConfig as Public } from '@lexibase/rdx-next'
    const shared: Shared = { metadata: { applicationName: 'Docs' } }
    const publicConfig: Public = shared
    const compatibility: RdxRuntimeConfig = publicConfig
    defineConfig(compatibility)
  `
  const options = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    paths: {
      '@lexibase/rdx-types': [
        path.resolve(root, '../rdx-types/dist/index.d.ts'),
      ],
      '@lexibase/rdx-next': [path.join(root, 'dist/index.d.ts')],
    },
  }
  const host = ts.createCompilerHost(options)
  const virtual = (name) => path.resolve(name) === path.resolve(filename)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.fileExists = (name) => virtual(name) || fileExists(name)
  host.readFile = (name) => (virtual(name) ? source : readFile(name))
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, ...rest) =>
    virtual(name)
      ? ts.createSourceFile(name, source, languageVersion, true)
      : getSourceFile(name, languageVersion, ...rest)
  const program = ts.createProgram([filename], options, host)
  const errors = ts.getPreEmitDiagnostics(program)
  assert.equal(
    errors.length,
    0,
    errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
      .join('\n')
  )
  const checker = program.getTypeChecker()
  const consumer = program.getSourceFile(filename)
  for (const declaration of consumer.statements.filter(
    ts.isImportDeclaration
  )) {
    const module = checker.getSymbolAtLocation(declaration.moduleSpecifier)
    const exports = checker.getExportsOfModule(module)
    assert.ok(exports.some((symbol) => symbol.name === 'RDXConfig'))
    assert.ok(!exports.some((symbol) => symbol.name === 'RdxConfig'))
    let canonical = exports.find((symbol) => symbol.name === 'RDXConfig')
    while (canonical.flags & ts.SymbolFlags.Alias)
      canonical = checker.getAliasedSymbol(canonical)
    assert.ok(
      !canonical.getJsDocTags(checker).some((tag) => tag.name === 'deprecated')
    )
    const config = checker.getDeclaredTypeOfSymbol(canonical)
    for (const field of [
      'description',
      'lang',
      'search',
      'TOC',
      'plugins',
      'metadata',
      'metadata.applicationName',
      'metadata.metadataBase',
      'metadata.authors',
      'metadata.icons',
      'metadata.icons.icon',
      'metadata.icons.shortcut',
      'metadata.icons.apple',
      'metadata.manifest',
      'metadata.openGraph.images',
      'metadata.twitter.card',
      'navbar.title',
      'navbar.logo',
      'navbar.actions.github.url',
      'navbar.actions.showToggleMode',
      'homepage.component',
      'theme.defaultTheme',
    ]) {
      let type = config
      let property
      for (const segment of field.split('.')) {
        property = checker.getPropertyOfType(type, segment)
        assert.ok(property, field)
        type = checker.getNonNullableType(
          checker.getTypeOfSymbolAtLocation(property, property.valueDeclaration)
        )
      }
      assert.ok(
        ts
          .displayPartsToString(property.getDocumentationComment(checker))
          .trim(),
        field
      )
    }
    assert.equal(checker.getPropertyOfType(config, 'title'), undefined)
    assert.equal(checker.getPropertyOfType(config, 'docsDir'), undefined)
  }
})
