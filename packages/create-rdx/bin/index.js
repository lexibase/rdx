#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import spawn from 'cross-spawn'
import fs from 'fs-extra'
import prompts from 'prompts'

import {
  isEnglish,
  parseArguments,
  validateLanguage,
  validateProjectName,
} from './options.mjs'
import { normalizePnpmRdxApprovals } from './pnpm-policy.mjs'
import { installedRuntime } from './installed-runtime.mjs'
import { runStep } from './progress.mjs'
import { createPnpmProgress } from './pnpm-progress.mjs'

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || ''

  if (userAgent.startsWith('pnpm')) return 'pnpm'
  if (userAgent.startsWith('yarn')) return 'yarn'

  return 'npm'
}

function run(command, args, cwd, label = `${command} ${args.join(' ')}`) {
  return new Promise((resolve, reject) => {
    // Reuse the Node entry point when available. Otherwise cross-spawn
    // resolves Windows command shims and escapes their arguments.
    const packageManagerEntry = process.env.npm_execpath
    const useNodeEntry =
      command === getPackageManager() &&
      packageManagerEntry &&
      /\.[cm]?js$/i.test(packageManagerEntry)
    const executable = useNodeEntry ? process.execPath : command
    const commandArgs = useNodeEntry ? [packageManagerEntry, ...args] : args
    const progress =
      command === 'pnpm' && args[0] === 'install'
        ? createPnpmProgress()
        : undefined
    if (progress) commandArgs.push('--reporter=ndjson')
    const child = spawn(executable, commandArgs, {
      cwd,
      stdio: progress ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true,
    })

    if (progress) {
      child.stdout.setEncoding('utf8').on('data', progress.stdout)
      child.stderr.setEncoding('utf8').on('data', progress.stderr)
    }
    child.on('error', (error) => {
      progress?.finish(false)
      reject(error)
    })
    child.on('close', (code) => {
      progress?.finish(code === 0)
      if (code === 0) resolve()
      else reject(new Error(`${label} exited with ${code}`))
    })
  })
}

async function main() {
  const {
    projectName: nameFromCli,
    lang: langFromCli,
    skipInstall,
    agentsMd,
    help,
    version,
  } = parseArguments(process.argv.slice(2))
  if (help) {
    console.log(
      'Usage: create-rdx [project-name] [--lang <tag>] [--skip-install] [--no-agents-md]'
    )
    console.log('  Without a project name, RDX asks for one interactively.')
    console.log(
      '  --lang <tag>    Primary documentation language, e.g. en or pt-BR.'
    )
    console.log(
      '  --skip-install  Create files without installing dependencies.'
    )
    console.log(
      '  --no-agents-md  Do not create AGENTS.md for AI coding agents.'
    )
    console.log('  --help, -h      Show this help.')
    console.log('  --version, -v   Show the generator version.')
    return
  }
  if (version) {
    const pkg = await fs.readJson(new URL('../package.json', import.meta.url))
    console.log(pkg.version)
    return
  }
  if (nameFromCli !== undefined) {
    const validation = validateProjectName(nameFromCli)
    if (validation !== true) throw new Error(validation)
  }
  const response =
    nameFromCli !== undefined
      ? { projectName: nameFromCli }
      : await prompts({
          type: 'text',
          name: 'projectName',
          message: 'What is your project named?',
          validate: validateProjectName,
        })

  const { projectName } = response
  if (!projectName) {
    console.log('Project creation cancelled.')
    return
  }
  const validation = validateProjectName(projectName)
  if (validation !== true) throw new Error(validation)

  // Ask only in an interactive terminal; scripts keep English unless --lang.
  let lang = langFromCli ?? 'en'
  if (!langFromCli && process.stdin.isTTY && process.stdout.isTTY) {
    const answer = await prompts({
      type: 'text',
      name: 'lang',
      message: 'What is the primary language of your documentation?',
      initial: 'en',
      validate: (value) =>
        typeof validateLanguage(value) === 'string'
          ? validateLanguage(value)
          : true,
    })
    if (!answer.lang) {
      console.log('Project creation cancelled.')
      return
    }
    lang = validateLanguage(answer.lang).canonical
  }

  const targetDir = path.resolve(process.cwd(), projectName)
  const relativeTarget = path.relative(process.cwd(), targetDir)

  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    throw new Error('Project must be created inside the current directory.')
  }
  await runStep(
    `[1/${skipInstall ? 1 : 3}] Creating project files...`,
    async () => {
      try {
        await fs.mkdir(targetDir)
      } catch (error) {
        if (error.code === 'EEXIST')
          throw new Error(
            `The path "${projectName}" already exists. Choose another name; existing files are never overwritten.`
          )
        throw error
      }

      const currentFile = fileURLToPath(import.meta.url)
      const templateDir = path.resolve(
        path.dirname(currentFile),
        '../templates/default'
      )
      await fs.copy(templateDir, targetDir, {
        errorOnExist: true,
        overwrite: false,
      })
      await fs.ensureDir(path.join(targetDir, 'public'))

      const configPath = path.join(targetDir, 'rdx.config.ts')
      const config = await fs.readFile(configPath, 'utf8')
      await fs.writeFile(
        configPath,
        config
          .replace(
            'since: new Date().getFullYear(),',
            `since: ${new Date().getFullYear()},`
          )
          .replace("lang: 'en',", `lang: '${lang}',`)
      )

      const gitignoreTemplatePath = path.join(targetDir, 'gitignore.template')
      await fs.move(gitignoreTemplatePath, path.join(targetDir, '.gitignore'), {
        overwrite: true,
      })
      await fs.remove(path.join(targetDir, 'gitignore'))
      await fs.remove(path.join(targetDir, '.npmignore'))

      // Stored under another name so agents editing this template ignore it.
      const agentsTemplatePath = path.join(targetDir, 'AGENTS.md.template')
      if (agentsMd)
        await fs.move(agentsTemplatePath, path.join(targetDir, 'AGENTS.md'))
      else await fs.remove(agentsTemplatePath)

      const pkgPath = path.join(targetDir, 'package.json')
      const pkg = await fs.readJson(pkgPath)
      pkg.name = projectName.toLowerCase()
      await fs.writeJson(pkgPath, pkg, { spaces: 2 })

      const readmePath = path.join(targetDir, 'README.md')
      const readme = await fs.readFile(readmePath, 'utf8')
      await fs.writeFile(
        readmePath,
        readme
          .replaceAll('{{RDX_PROJECT_NAME}}', projectName)
          .replaceAll('__RDX_PROJECT_NAME__', projectName)
      )
    }
  )

  const packageManager = getPackageManager()

  if (!skipInstall) {
    try {
      await runStep(
        `[2/3] Installing dependencies with ${packageManager}...`,
        async () => {
          if (packageManager === 'pnpm')
            await normalizePnpmRdxApprovals(targetDir)
          await run(packageManager, ['install'], targetDir)
          if (packageManager === 'pnpm')
            await normalizePnpmRdxApprovals(targetDir)
        },
        { intervalMs: packageManager === 'pnpm' ? 0 : 15_000 }
      )
      await runStep('[3/3] Preparing RDX...', async () => {
        // Non-English projects start with a _labels.json ready to translate.
        const commands = [
          ...(isEnglish(lang) ? [] : [['i18n', 'sync']]),
          ['prepare'],
        ]
        for (const args of commands) {
          if (packageManager === 'yarn') {
            // Yarn provides the project's Plug'n'Play loader when needed.
            await run(packageManager, ['exec', 'rdx', ...args], targetDir)
          } else {
            // Avoid another package-manager startup and automatic install check.
            const executable = await installedRuntime(targetDir)
            await run(
              process.execPath,
              [executable, ...args],
              targetDir,
              `rdx ${args.join(' ')}`
            )
          }
        }
      })
    } catch (error) {
      const runner = packageManager === 'npm' ? 'npm run' : packageManager
      throw new Error(
        `${error.message}\nProject files were kept in "${projectName}". Fix the reported error, then retry:\n  cd ${projectName}\n  ${packageManager} install\n  ${runner} dev`
      )
    }
  }

  console.log(`\nRDX project "${projectName}" created successfully.\n`)
  if (skipInstall && !isEnglish(lang))
    console.log(
      `After installing, run "rdx i18n sync" to create _labels.json for ${lang}.\n`
    )
  console.log(`  cd ${projectName}`)
  console.log(
    `  ${packageManager === 'npm' ? 'npm run' : packageManager} dev\n`
  )
}

try {
  await main()
} catch (error) {
  console.error(`[RDX] ${error.message}`)
  process.exitCode = 1
}
