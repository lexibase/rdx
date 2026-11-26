import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { access, cp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { parseArgs } from 'node:util'

import { createRdxProject } from '@lexibase/rdx-core/config'
import { createJiti } from 'jiti'

import postcssConfig from '../postcss.config.mjs'
import { preparePublicAssets } from './public-assets.mjs'
import { prepareProjectStyles } from './project-styles.mjs'
import { prepareLocaleRoutes } from './locale-routes.mjs'

const checkUsage =
  'Usage: rdx check [--json] [--max-warnings N] [--baseline FILE | --write-baseline FILE]'

function parseCheckArguments(args) {
  let values
  try {
    values = parseArgs({
      args,
      options: {
        json: { type: 'boolean' },
        'max-warnings': { type: 'string' },
        baseline: { type: 'string' },
        'write-baseline': { type: 'string' },
      },
    }).values
  } catch (error) {
    throw new Error(`${error.message}\n${checkUsage}`, { cause: error })
  }
  const limit = values['max-warnings']
  const maxWarnings = limit === undefined ? undefined : Number(limit)
  if (
    limit !== undefined &&
    (!/^\d+$/.test(limit) || !Number.isSafeInteger(maxWarnings))
  )
    throw new Error(
      `--max-warnings requires a non-negative safe integer.\n${checkUsage}`
    )
  const { baseline, 'write-baseline': writeBaseline } = values
  for (const [flag, value] of [
    ['--baseline', baseline],
    ['--write-baseline', writeBaseline],
  ]) {
    if (value !== undefined && !value.trim())
      throw new Error(`${flag} requires a file path.\n${checkUsage}`)
  }
  if (baseline && writeBaseline)
    throw new Error(
      `Choose either --baseline or --write-baseline.\n${checkUsage}`
    )
  return { json: values.json, maxWarnings, baseline, writeBaseline }
}

export async function runRdxCli({ templateDir } = {}) {
  const supportedCommands = new Set(['dev', 'build', 'start'])
  let command = process.argv[2]
  const commandArgs = process.argv.slice(3)
  const projectRoot = process.cwd()
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )
  const runtimeTemplate =
    templateDir ?? path.join(packageRoot, 'templates', 'runtime')
  const runtimeDirectory = path.join(projectRoot, '.rdx')

  async function prepareRuntime(project, homepageTranslations) {
    await mkdir(runtimeDirectory, { recursive: true })
    await preparePublicAssets(projectRoot, runtimeDirectory)
    await cp(runtimeTemplate, runtimeDirectory, {
      force: true,
      recursive: true,
    })
    await prepareProjectStyles(projectRoot, runtimeDirectory)
    await prepareLocaleRoutes(project, runtimeDirectory, runtimeTemplate)
    if (homepageTranslations) {
      const { prepareHomepageTranslations } =
        await import('./homepage-translations.mjs')
      await prepareHomepageTranslations(runtimeDirectory, homepageTranslations)
    }
    // Resolve in Node before Next processes this file: UI may be transitive,
    // and native Tailwind plugins must stay outside the Turbopack module graph.
    const resolvePlugin = createRequire(import.meta.url)
    const plugins = Object.fromEntries(
      Object.entries(postcssConfig.plugins).map(([name, options]) => [
        resolvePlugin.resolve(name),
        options,
      ])
    )
    await writeFile(
      path.join(runtimeDirectory, 'postcss.config.mjs'),
      `export default ${JSON.stringify({ ...postcssConfig, plugins }, null, 2)}\n`
    )
  }

  async function main() {
    let checkOptions = {}
    if (!command || command === 'help' || command === '--help') {
      console.log(
        'Usage: rdx <dev|build|start|prepare|check|add|plugin-command>'
      )
      console.log(
        '  rdx check [options]: validate documentation links, sections and local assets'
      )
      console.log('  rdx add versioning [--package-manager npm|pnpm|yarn]')
      console.log('  rdx add changelog [--package-manager npm|pnpm|yarn]')
      console.log(
        '  rdx add i18n [--locales en,es-ES] [--package-manager npm|pnpm|yarn]'
      )
      console.log(
        '  rdx i18n sync: add missing phrases to homepage translation catalogs'
      )
      console.log(
        'Plugin commands are registered through plugins in rdx.config.ts.'
      )
      return
    }

    if (command === 'check') {
      if (
        commandArgs.length === 1 &&
        ['--help', '-h'].includes(commandArgs[0])
      ) {
        console.log(
          `${checkUsage}\nValidate static Markdown and MDX links, section anchors and local public/ files without building the site.\n  --json  Write the documentation report as JSON to stdout.\n  --max-warnings N  Fail when the report contains more than N warnings.\n  --baseline FILE  Fail on warnings that are new to the baseline.\n  --write-baseline FILE  Save current warnings to a new baseline file.`
        )
        return
      }
      checkOptions = parseCheckArguments(commandArgs)
    }

    const syncHomepage = command === 'i18n' && commandArgs[0] === 'sync'
    if (
      syncHomepage &&
      commandArgs.length === 2 &&
      ['--help', '-h'].includes(commandArgs[1])
    ) {
      console.log(
        'Usage: rdx i18n sync\nAdd missing homepage phrases to the configured languages’ home.json files.'
      )
      return
    }

    if (command === 'add') {
      if (
        (commandArgs.length === 1 &&
          ['--help', '-h'].includes(commandArgs[0])) ||
        (commandArgs.length === 2 &&
          ['versioning', 'i18n', 'changelog'].includes(commandArgs[0]) &&
          ['--help', '-h'].includes(commandArgs[1]))
      ) {
        console.log(
          'Usage: rdx add versioning|i18n|changelog [--package-manager npm|pnpm|yarn]'
        )
        console.log(
          '  i18n: reuse lang and ask for additional languages, or pass --locales en,es-ES.'
        )
        console.log(
          '  Existing i18n languages are edited in rdx.config.ts and locale/<folder>/docs/.'
        )
        return
      }
      const { addVersioning, addI18n, addChangelog, parseAddArguments } =
        await import('./add-plugin.mjs')
      const options = parseAddArguments(commandArgs)
      const add = {
        versioning: addVersioning,
        i18n: addI18n,
        changelog: addChangelog,
      }
      const result = await add[commandArgs[0]](projectRoot, options)
      if (result.cancelled) return
      command = 'prepare'
    }

    const configPath = path.join(projectRoot, 'rdx.config.ts')
    try {
      await access(configPath)
    } catch {
      throw new Error(
        `Missing ${configPath}. Run rdx from the documentation project root.`
      )
    }

    const jiti = createJiti(import.meta.url, {
      moduleCache: false,
      fsCache: false,
      jsx: { runtime: 'automatic' },
    })
    let input
    try {
      input = await jiti.import(configPath, { default: true })
    } catch (error) {
      const hint =
        error.code === 'MODULE_NOT_FOUND' ||
        error.code === 'ERR_MODULE_NOT_FOUND'
          ? ' If a configured plugin cannot be resolved, install its package in this project.'
          : ''
      throw new Error(`Could not load rdx.config.ts: ${error.message}${hint}`, {
        cause: error,
      })
    }

    const project = await createRdxProject(input, {
      rootDir: projectRoot,
      command,
    })
    if (
      syncHomepage &&
      !project.commands.some((entry) => entry.name === 'i18n')
    ) {
      if (commandArgs.length !== 1) throw new Error('Usage: rdx i18n sync')
      const { syncHomepageTranslations } =
        await import('./homepage-translations.mjs')
      await syncHomepageTranslations(project)
      return
    }
    let homepageTranslations
    if (
      project.config.homepage?.enabled &&
      project.config.homepage.translations &&
      (supportedCommands.has(command) ||
        command === 'check' ||
        command === 'prepare')
    ) {
      const { readHomepageTranslations } =
        await import('./homepage-translations.mjs')
      homepageTranslations = await readHomepageTranslations(project, {
        report: command === 'check' || command === 'build',
      })
    }
    if (command === 'check' || command === 'build') {
      const { checkDocumentation, formatDocumentationCheck } =
        await import('@lexibase/rdx-core/check')
      const report = checkDocumentation(project)
      const { json, maxWarnings, baseline, writeBaseline } = checkOptions
      const warnings = report.warnings ?? []
      const warningLimitExceeded =
        maxWarnings !== undefined && warnings.length > maxWarnings
      let baselineReport
      if (baseline) {
        const { findNewWarnings } = await import('./warning-baseline.mjs')
        const newWarnings = await findNewWarnings(baseline, warnings)
        baselineReport = {
          file: baseline,
          knownWarningCount: warnings.length - newWarnings.length,
          newWarnings,
        }
      }
      const failed =
        report.diagnostics.length > 0 ||
        warningLimitExceeded ||
        (baselineReport?.newWarnings.length ?? 0) > 0
      if (writeBaseline && !failed) {
        const { writeWarningBaseline } = await import('./warning-baseline.mjs')
        await writeWarningBaseline(writeBaseline, warnings)
        const message = `Warning baseline written to "${writeBaseline}".`
        if (json) console.error(message)
        else console.log(message)
      }
      if (json) {
        console.log(
          JSON.stringify({
            ...report,
            warnings,
            ...(maxWarnings === undefined
              ? {}
              : { maxWarnings, warningLimitExceeded }),
            ...(baselineReport ? { baseline: baselineReport } : {}),
          })
        )
        if (failed) process.exitCode = 1
        return
      }
      const output = formatDocumentationCheck(
        baselineReport
          ? { ...report, warnings: baselineReport.newWarnings }
          : report,
        warningLimitExceeded ? maxWarnings : undefined,
        baselineReport?.knownWarningCount
      )
      if (failed) {
        console.error(output)
        process.exitCode = 1
        return
      } else console.log(output)
      if (command === 'check') return
    }
    if (command === 'prepare') {
      await prepareRuntime(project, homepageTranslations)
      console.log('RDX runtime prepared in .rdx/')
      return
    }
    if (!supportedCommands.has(command)) {
      const pluginCommand = project.commands.find(
        (entry) => entry.name === command
      )
      if (!pluginCommand)
        throw new Error(
          `Unknown command "${command}". Available: dev, build, start, prepare, check, add${project.commands.map((entry) => `, ${entry.name}`).join('')}. Install and configure the plugin that provides this command.`
        )
      await pluginCommand.run({
        rootDir: projectRoot,
        config: project.config,
        command,
        args: commandArgs,
      })
      return
    }

    await prepareRuntime(project, homepageTranslations)
    const projectRequire = createRequire(path.join(projectRoot, 'package.json'))
    const nextCli = projectRequire.resolve('next/dist/bin/next')
    const child = spawn(
      process.execPath,
      [nextCli, command, runtimeDirectory, ...commandArgs],
      { cwd: projectRoot, stdio: 'inherit' }
    )
    child.on('error', (error) => {
      console.error(`[RDX] Could not start Next.js: ${error.message}`)
      process.exitCode = 1
    })
    child.on('exit', (code, signal) => {
      if (signal) process.kill(process.pid, signal)
      process.exit(code ?? 1)
    })
  }

  try {
    await main()
  } catch (error) {
    console.error(`[RDX] ${error.message}`)
    process.exitCode = 1
  }
}
