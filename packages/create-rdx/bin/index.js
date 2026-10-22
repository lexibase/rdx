#!/usr/bin/env node

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import spawn from 'cross-spawn'
import fs from 'fs-extra'
import prompts from 'prompts'

const projectNamePattern = /^[a-z0-9][a-z0-9._-]*$/i
const argumentsFromCli = process.argv.slice(2)
const skipInstall = argumentsFromCli.includes('--skip-install')
const nameFromCli = argumentsFromCli.find(
  (argument) => !argument.startsWith('-')
)

function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || ''

  if (userAgent.startsWith('pnpm')) return 'pnpm'
  if (userAgent.startsWith('yarn')) return 'yarn'

  return 'npm'
}

function validateProjectName(projectName) {
  if (!projectName) return 'Please enter a project name.'
  if (!projectNamePattern.test(projectName)) {
    return 'Use letters, numbers, dots, dashes, or underscores only.'
  }
  if (projectName === '.' || projectName === '..') {
    return 'Choose a name other than . or ...'
  }

  return true
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

const response = nameFromCli
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
  process.exit(0)
}

const targetDir = path.resolve(process.cwd(), projectName)
const relativeTarget = path.relative(process.cwd(), targetDir)

if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
  throw new Error('Project must be created inside the current directory.')
}
if (await fs.pathExists(targetDir)) {
  throw new Error(`The directory "${projectName}" already exists.`)
}

const currentFile = fileURLToPath(import.meta.url)
const templateDir = path.resolve(
  path.dirname(currentFile),
  '../templates/default'
)
await fs.copy(templateDir, targetDir, { errorOnExist: true })
await fs.ensureDir(path.join(targetDir, 'public'))

const gitignoreTemplatePath = path.join(targetDir, 'gitignore.template')
await fs.move(gitignoreTemplatePath, path.join(targetDir, '.gitignore'), {
  overwrite: true,
})
await fs.remove(path.join(targetDir, 'gitignore'))
await fs.remove(path.join(targetDir, '.npmignore'))

const pkgPath = path.join(targetDir, 'package.json')
const pkg = await fs.readJson(pkgPath)
pkg.name = projectName
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
  console.log(`\nInstalling dependencies with ${packageManager}...\n`)
  await run(packageManager, ['install'], targetDir)
  const prepareArgs =
    packageManager === 'npm'
      ? ['exec', '--', 'rdx', 'prepare']
      : ['exec', 'rdx', 'prepare']
  await run(packageManager, prepareArgs, targetDir)
}

console.log(`\nRDX project "${projectName}" created successfully.\n`)
console.log(`  cd ${projectName}`)
console.log(`  ${packageManager === 'npm' ? 'npm run' : packageManager} dev\n`)
