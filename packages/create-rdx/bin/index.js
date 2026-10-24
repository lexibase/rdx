#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import spawn from 'cross-spawn'
import fs from 'fs-extra'
import prompts from 'prompts'

import { parseArguments, validateProjectName } from './options.mjs'

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || ''

  if (userAgent.startsWith('pnpm')) return 'pnpm'
  if (userAgent.startsWith('yarn')) return 'yarn'

  return 'npm'
}

function run(command, args, cwd) {
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
    const child = spawn(executable, commandArgs, {
      cwd,
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    })
  })
}

async function main() {
  const {
    projectName: nameFromCli,
    skipInstall,
    help,
    version,
  } = parseArguments(process.argv.slice(2))
  if (help) {
    console.log('Usage: create-rdx [project-name] [--skip-install]')
    console.log('  Without a project name, RDX asks for one interactively.')
    console.log(
      '  --skip-install  Create files without installing dependencies.'
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

  const targetDir = path.resolve(process.cwd(), projectName)
  const relativeTarget = path.relative(process.cwd(), targetDir)

  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    throw new Error('Project must be created inside the current directory.')
  }
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
    config.replace(
      'since: new Date().getFullYear(),',
      `since: ${new Date().getFullYear()},`
    )
  )

  const gitignoreTemplatePath = path.join(targetDir, 'gitignore.template')
  await fs.move(gitignoreTemplatePath, path.join(targetDir, '.gitignore'), {
    overwrite: true,
  })
  await fs.remove(path.join(targetDir, 'gitignore'))
  await fs.remove(path.join(targetDir, '.npmignore'))

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

  const packageManager = getPackageManager()

  if (!skipInstall) {
    try {
      console.log(`\nInstalling dependencies with ${packageManager}...\n`)
      await run(packageManager, ['install'], targetDir)
      const prepareArgs =
        packageManager === 'npm'
          ? ['exec', '--', 'rdx', 'prepare']
          : ['exec', 'rdx', 'prepare']
      await run(packageManager, prepareArgs, targetDir)
    } catch (error) {
      const runner = packageManager === 'npm' ? 'npm run' : packageManager
      throw new Error(
        `${error.message}\nProject files were kept in "${projectName}". Fix the reported error, then retry:\n  cd ${projectName}\n  ${packageManager} install\n  ${runner} dev`
      )
    }
  }

  console.log(`\nRDX project "${projectName}" created successfully.\n`)
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
