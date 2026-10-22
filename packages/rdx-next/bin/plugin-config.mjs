import ts from 'typescript'

export const versioningPackage = '@lexibase/rdx-versioning'
const manual = `Cannot safely edit rdx.config.ts. Add "import { versioning } from '${versioningPackage}'" and versioning() to plugins manually, then run rdx prepare.`

function unwrap(node) {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    node = node.expression
  return node
}

// Edit only known literal shapes; never print/reconstruct the user's entire file.
export function activateVersioning(source) {
  const file = ts.createSourceFile(
    'rdx.config.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  if (file.parseDiagnostics.length) throw new Error(manual)
  const imports = file.statements.filter(ts.isImportDeclaration)
  const definitions = new Set()
  let factory
  for (const entry of imports) {
    const name = entry.moduleSpecifier.text
    const clause = entry.importClause
    if (!clause || clause.isTypeOnly) continue
    const bindings = clause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const specifier of bindings.elements) {
        if (specifier.isTypeOnly) continue
        const imported = (specifier.propertyName ?? specifier.name).text
        if (
          ['@lexibase/rdx-next', '@lexibase/rdx-core/config'].includes(name) &&
          imported === 'defineConfig'
        )
          definitions.add(specifier.name.text)
        if (name === versioningPackage && imported === 'versioning') {
          if (factory) throw new Error(manual)
          factory = specifier.name.text
        }
      }
    } else if (
      bindings &&
      ts.isNamespaceImport(bindings) &&
      name === versioningPackage
    ) {
      if (factory) throw new Error(manual)
      factory = `${bindings.name.text}.versioning`
    }
  }
  const exports = file.statements.filter(ts.isExportAssignment)
  if (exports.length !== 1 || exports[0].isExportEquals) throw new Error(manual)
  let config = unwrap(exports[0].expression)
  if (ts.isCallExpression(config)) {
    if (
      !ts.isIdentifier(config.expression) ||
      !definitions.has(config.expression.text) ||
      config.arguments.length !== 1
    )
      throw new Error(manual)
    config = unwrap(config.arguments[0])
  }
  if (!ts.isObjectLiteralExpression(config)) throw new Error(manual)
  const properties = config.properties
  if (
    properties.some(
      (entry) =>
        !ts.isPropertyAssignment(entry) || ts.isComputedPropertyName(entry.name)
    )
  )
    throw new Error(manual)
  const pluginsProperties = properties.filter(
    (entry) => entry.name.text === 'plugins'
  )
  if (pluginsProperties.length > 1) throw new Error(manual)
  const plugins = pluginsProperties.length
    ? unwrap(pluginsProperties[0].initializer)
    : undefined
  if (
    plugins &&
    (!ts.isArrayLiteralExpression(plugins) ||
      plugins.elements.some(ts.isSpreadElement))
  )
    throw new Error(manual)
  if (plugins && factory) {
    const matches = plugins.elements.filter(
      (entry) =>
        ts.isCallExpression(unwrap(entry)) &&
        unwrap(entry).expression.getText(file) === factory
    )
    if (matches.length > 1)
      throw new Error(
        'Versioning is configured more than once. Remove the duplicate plugin before retrying.'
      )
    if (matches.length === 1) return source
  }
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  const edits = []
  if (!factory) {
    const identifiers = new Set()
    function visit(node) {
      if (ts.isIdentifier(node)) identifiers.add(node.text)
      ts.forEachChild(node, visit)
    }
    visit(file)
    factory = 'versioning'
    let suffix = 1
    while (identifiers.has(factory)) factory = `rdxVersioning${suffix++}`
    const specifier =
      factory === 'versioning' ? 'versioning' : `versioning as ${factory}`
    let position = imports.length
      ? imports.at(-1).end
      : file.statements[0].getStart(file)
    if (!imports.length) {
      for (const statement of file.statements) {
        if (
          !ts.isExpressionStatement(statement) ||
          !ts.isStringLiteral(statement.expression)
        )
          break
        position = statement.end
      }
    }
    edits.push({
      position,
      text: `${newline}import { ${specifier} } from '${versioningPackage}'${newline}`,
    })
  }
  if (plugins) {
    const position = plugins.elements.length
      ? plugins.elements.at(-1).end
      : plugins.getStart(file) + 1
    edits.push({
      position,
      text: `${plugins.elements.length ? ',' : ''} ${factory}()`,
    })
  } else {
    if (properties.length && !properties.hasTrailingComma)
      edits.push({ position: properties.at(-1).end, text: ',' })
    edits.push({
      position: config.end - 1,
      text: `${newline}  plugins: [${factory}()],${newline}`,
    })
  }
  for (const edit of edits.sort((a, b) => b.position - a.position))
    source =
      source.slice(0, edit.position) + edit.text + source.slice(edit.position)
  return source
}
