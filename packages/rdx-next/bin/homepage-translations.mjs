import { readFile, stat, writeFile } from 'node:fs/promises'
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
  const file = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest)
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
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      phrases.add(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return phrases
}

export async function readHomepageTranslations(
  project,
  { report = false } = {}
) {
  const { rootDir, config, localization } = project
  const phrases = config.homepage.translations
    ? await sourcePhrases(rootDir)
    : undefined
  const catalogs = []
  const overrides = []
  for (const locale of localization?.locales ?? []) {
    if (!locale.folder) continue
    const folder = `locale/${locale.folder}`
    const override = await stat(path.join(rootDir, folder, 'home.tsx')).then(
      (entry) => entry.isFile(),
      (error) => {
        if (missingFile(error)) return false
        throw error
      }
    )
    if (override) overrides.push({ locale: locale.path, folder })
    if (!override && !phrases) continue

    const file = `${folder}/home.json`
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
    if (!report || override || !phrases) continue
    for (const phrase of phrases) {
      if (phrase === metadataKey) continue
      if (
        !Object.hasOwn(messages, phrase) ||
        typeof messages[phrase] !== 'string' ||
        !messages[phrase].trim()
      )
        console.warn(
          `[RDX] ${file}: missing translation for ${JSON.stringify(phrase)}`
        )
    }
    for (const phrase of Object.keys(messages)) {
      if (phrase !== metadataKey && !phrases.has(phrase))
        console.warn(
          `[RDX] ${file}: orphaned translation for ${JSON.stringify(phrase)}`
        )
    }
  }
  return { catalogs, overrides, phrases }
}

export async function prepareHomepageTranslations(
  runtime,
  { catalogs, overrides, phrases }
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
    `${phrases ? "import translatedComponent from '../components/home'" : ''}
${imports.join('\n')}

const catalogs = new Map<string, Record<string, unknown>>([
${entries.join('\n')}
])

const phrases: string[] = ${JSON.stringify([...(phrases ?? [])].filter((phrase) => phrase !== metadataKey))}
const overrides: string[] = ${JSON.stringify(overrides.map(({ locale }) => locale))}

${
  phrases
    ? `export function getHomepageTranslation(locale?: string) {
  return { translatedComponent, messages: locale ? catalogs.get(locale) : undefined }
}`
    : 'export const getHomepageTranslation: (locale?: string) => object = () => ({})'
}

export function getHomepageSeo(locale?: string) {
  const translatedLocales = new Set(overrides)
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
