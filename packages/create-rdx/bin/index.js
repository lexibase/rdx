#!/usr/bin/env node

import prompts from 'prompts';
import path from 'node:path'
import fs from 'fs-extra'

const response = await prompts({
  type: 'text',
  name: 'projectName',
  message: 'What is your project name?',
})

const { projectName } = response
const targetDir = path.resolve(process.cwd(), projectName)

const templateDir = path.resolve(import.meta.dirname, '../templates/default')
await fs.copy(templateDir, targetDir)

const pkgPath = path.join(targetDir, 'package.json')
const pkg = await fs.readJson(pkgPath)
pkg.name = projectName
await fs.writeJson(pkgPath, pkg, { spaces: 2 })

await fs.ensureDir(path.join(targetDir, 'docs'))
await fs.ensureDir(path.join(targetDir, 'docs/cat-01'))

await fs.outputFile(path.join(targetDir, 'docs/cat-01/_category.json'), JSON.stringify({
  title: 'Category 01',
  sidebar_position: 1,
}, null, 2))

await fs.outputFile(path.join(targetDir, 'docs/cat-01/intro.mdx'), `# Welcome to category 1\n\nThis is the introduction to category 1.`)

console.log(`Project "${projectName}" has been created at ${targetDir}`)
