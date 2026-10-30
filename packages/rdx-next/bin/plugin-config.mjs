import ts from 'typescript'

export const versioningPackage = '@lexibase/rdx-versioning'
export const i18nPackage = '@lexibase/rdx-i18n'
const versioning = {
  packageName: versioningPackage,
  name: 'versioning',
  label: 'Versioning',
}
const localization = { packageName: i18nPackage, name: 'i18n', label: 'i18n' }

export function activateVersioning(source) {
  return editPluginConfig(source, versioning)
}

export function inspectI18n(source) {
  return editPluginConfig(source, localization, '', true)
}

export function activateI18n(source, locales) {
  return editPluginConfig(
    source,
    localization,
    JSON.stringify({ locales }, null, 2)
  )
}

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
function editPluginConfig(source, plugin, argument = '', inspect = false) {
  const { packageName, name: pluginName, label } = plugin
  const manual = `Cannot safely edit rdx.config.ts. Add "import { ${pluginName} } from '${packageName}'" and ${pluginName}(${pluginName === 'i18n' ? '{ locales: [...] }' : ''}) to plugins manually, then run rdx prepare.`
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
          [
            '@lexibase/rdx',
            '@lexibase/rdx-next',
            '@lexibase/rdx-core/config',
          ].includes(name) &&
          imported === 'defineConfig'
        )
          definitions.add(specifier.name.text)
        if (name === packageName && imported === pluginName) {
          if (factory) throw new Error(manual)
          factory = specifier.name.text
        }
      }
    } else if (
      bindings &&
      ts.isNamespaceImport(bindings) &&
      name === packageName
    ) {
      if (factory) throw new Error(manual)
      factory = `${bindings.name.text}.${pluginName}`
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
        `${label} is configured more than once. Remove the duplicate plugin before retrying.`
      )
    if (matches.length === 1) return inspect ? { configured: true } : source
  }
  if (inspect) {
    const languages = properties.filter((entry) => entry.name.text === 'lang')
    if (languages.length > 1) throw new Error(manual)
    const language = languages.length
      ? unwrap(languages[0].initializer)
      : undefined
    if (language && !ts.isStringLiteral(language)) throw new Error(manual)
    return { configured: false, lang: language?.text ?? 'en' }
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
    factory = pluginName
    let suffix = 1
    const alias = `rdx${pluginName[0].toUpperCase()}${pluginName.slice(1)}`
    while (identifiers.has(factory)) factory = `${alias}${suffix++}`
    const specifier =
      factory === pluginName ? pluginName : `${pluginName} as ${factory}`
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
      text: `${newline}import { ${specifier} } from '${packageName}'${newline}`,
    })
  }
  if (plugins) {
    const position = plugins.elements.length
      ? plugins.elements.at(-1).end
      : plugins.getStart(file) + 1
    edits.push({
      position,
      text: `${plugins.elements.length ? ',' : ''} ${factory}(${argument.replaceAll('\n', newline)})`,
    })
  } else {
    if (properties.length && !properties.hasTrailingComma)
      edits.push({ position: properties.at(-1).end, text: ',' })
    edits.push({
      position: config.end - 1,
      text: `${newline}  plugins: [${factory}(${argument.replaceAll('\n', newline)})],${newline}`,
    })
  }
  for (const edit of edits.sort((a, b) => b.position - a.position))
    source =
      source.slice(0, edit.position) + edit.text + source.slice(edit.position)
  return source
}
