import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import ts from 'typescript'

const sourceFile = 'components/home.tsx'

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

function sourcePhrases(source) {
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
  if (!config.homepage?.enabled || !config.homepage.translations) return

  const source = await readOptional(path.join(rootDir, sourceFile))
  if (source === undefined)
    throw new Error(`Create ${sourceFile} to use homepage.translations.`)
  const phrases = sourcePhrases(source)
  const catalogs = []
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
    if (override) continue

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
    for (const phrase of Object.keys(messages)) {
      if (!phrases.has(phrase))
        console.warn(
          `[RDX] ${file}: orphaned translation for ${JSON.stringify(phrase)}`
        )
    }
  }
  return catalogs
}

export async function prepareHomepageTranslations(runtime, catalogs) {
  if (!catalogs) return
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

export function getHomepageTranslation(locale?: string) {
  return { translatedComponent, messages: locale ? catalogs.get(locale) : undefined }
}
`
  )
}
