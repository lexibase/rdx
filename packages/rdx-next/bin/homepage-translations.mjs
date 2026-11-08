import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourceFile = 'components/home.tsx'
const metadataKey = '$metadata'

function missingFile(error) {
  return error.code === 'ENOENT' || error.code === 'ENOTDIR'
}

async function readOptional(file) {
  try {
    return await readFile(file, 'utf8')
  } catch (error) {
    if (!missingFile(error)) throw error
  }
}

async function sourcePhrases(rootDir) {
  const source = await readOptional(path.join(rootDir, sourceFile))
  if (source === undefined)
    throw new Error(`Create ${sourceFile} to use homepage.translations.`)
  const { default: ts } = await import('typescript')
  const file = ts.createSourceFile(
    sourceFile,
    source,
    ts.ScriptTarget.Latest,
    true
  )
  for (const statement of file.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    )
      break
    if (statement.expression.text === 'use client')
      throw new Error(
        `${sourceFile} must be a Server Component when homepage.translations is enabled. Move 'use client' into interactive child components.`
      )
  }
  const phrases = new Set()
  const warnings = []
  const passedOn =
    't is passed on or renamed; phrases translated elsewhere are left out of the translation report'
  const needsLiteral =
    't() needs a literal phrase; this call is left out of the translation report'
  function warn(node, message) {
    const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
    warnings.push({ line: line + 1, message })
  }

  // Bind identifiers within this file so an unrelated or shadowed t is ignored.
  const options = { noLib: true, noResolve: true, types: [] }
  const program = ts.createProgram([sourceFile], options, {
    ...ts.createCompilerHost(options),
    getSourceFile: (name) => (name === sourceFile ? file : undefined),
  })
  const checker = program.getTypeChecker()
  const bindings = new Set()
  function findBindings(node) {
    if (
      ts.isBindingElement(node) &&
      ts.isObjectBindingPattern(node.parent) &&
      ts.isIdentifier(node.name)
    ) {
      const key = node.propertyName ?? node.name
      if (ts.isStringLiteralLike(key) || ts.isIdentifier(key)) {
        if (key.text === 't') {
          if (node.name.text === 't')
            bindings.add(checker.getSymbolAtLocation(node.name))
          else warn(node, passedOn)
        }
      }
    }
    ts.forEachChild(node, findBindings)
  }
  findBindings(file)

  function visit(node) {
    if (ts.isIdentifier(node) && node.text === 't') {
      const parent = node.parent
      const symbol = ts.isShorthandPropertyAssignment(parent)
        ? checker.getShorthandAssignmentValueSymbol(parent)
        : checker.getSymbolAtLocation(node)
      if (
        symbol &&
        bindings.has(symbol) &&
        !ts.isBindingElement(parent) &&
        !ts.isTypeQueryNode(parent)
      ) {
        if (ts.isCallExpression(parent) && parent.expression === node) {
          const [argument] = parent.arguments
          if (parent.arguments.length === 1 && ts.isStringLiteralLike(argument))
            phrases.add(argument.text)
          else warn(node, needsLiteral)
        } else warn(node, passedOn)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { phrases, warnings }
}

export async function readHomepageTranslations(
  project,
  { report = false } = {}
) {
  const { rootDir, localization } = project
  const { phrases, warnings } = await sourcePhrases(rootDir)
  if (report) {
    for (const { line, message } of warnings.sort((a, b) => a.line - b.line))
      console.warn(`[RDX] ${sourceFile}:${line}: ${message}`)
  }
  phrases.delete(metadataKey)
  const catalogs = []
  for (const locale of localization?.locales ?? []) {
    if (!locale.folder) continue
    const file = `locale/${locale.folder}/home.json`
    const raw = await readOptional(path.join(rootDir, file))
    let messages = {}
    if (raw !== undefined) {
      try {
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
          throw new Error('Expected a JSON object.')
        messages = parsed
        catalogs.push({ file, locale: locale.path })
      } catch {
        console.warn(
          `[RDX] ${file}: expected a JSON object of homepage phrases. Using the primary text.`
        )
      }
    }
    if (!report) continue
    for (const phrase of phrases) {
      if (
        !Object.hasOwn(messages, phrase) ||
        typeof messages[phrase] !== 'string' ||
        !messages[phrase].trim()
      )
        console.warn(
          `[RDX] ${file}: missing translation for ${JSON.stringify(phrase)}`
        )
    }
    // An unrecognized call may use any of the remaining keys.
    if (!warnings.length) {
      for (const phrase of Object.keys(messages)) {
        if (phrase !== metadataKey && !phrases.has(phrase))
          console.warn(
            `[RDX] ${file}: orphaned translation for ${JSON.stringify(phrase)}`
          )
      }
    }
  }
  return { catalogs, phrases }
}

export async function prepareHomepageTranslations(
  runtime,
  { catalogs, phrases }
) {
  const imports = catalogs.map(
    ({ file }, index) =>
      `import messages${index} from ${JSON.stringify(`../${file}`)}`
  )
  const entries = catalogs.map(
    ({ locale }, index) => `  [${JSON.stringify(locale)}, messages${index}],`
  )
  await writeFile(
    path.join(runtime, 'rdx-home.ts'),
    `import translatedComponent from '../components/home'
${imports.join('\n')}

const catalogs = new Map<string, Record<string, unknown>>([
${entries.join('\n')}
])

const phrases: string[] = ${JSON.stringify([...phrases])}

export function getHomepageTranslation(locale?: string) {
  return { translatedComponent, messages: locale ? catalogs.get(locale) : undefined }
}

export function getHomepageSeo(locale?: string) {
  const translatedLocales = new Set<string>()
  for (const [path, catalog] of catalogs) {
    if (phrases.some((phrase) => {
      const text = Object.hasOwn(catalog, phrase) ? catalog[phrase] : undefined
      return typeof text === 'string' && text.trim() && text.trim() !== phrase.trim()
    })) translatedLocales.add(path)
  }
  return { translatedLocales, metadata: locale ? catalogs.get(locale)?.${metadataKey} : undefined }
}
`
  )
}
