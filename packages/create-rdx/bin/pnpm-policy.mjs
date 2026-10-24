import { randomUUID } from 'node:crypto'
import { lstat, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { isScalar, isSeq, parseDocument } from 'yaml'

const rdxPackages = new Set([
  '@lexibase/rdx',
  '@lexibase/rdx-core',
  '@lexibase/rdx-next',
  '@lexibase/rdx-types',
  '@lexibase/rdx-ui',
  '@lexibase/rdx-versioning',
  '@lexibase/create-rdx',
])
const version =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\da-z.-]+)?(?:\+[\da-z.-]+)?$/i

async function workspaceFile(directory) {
  let current = path.resolve(directory)
  while (true) {
    const filename = path.join(current, 'pnpm-workspace.yaml')
    try {
      const info = await lstat(filename)
      if (!info.isFile() || info.isSymbolicLink()) return undefined
      return filename
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

function exactRule(value) {
  if (typeof value !== 'string') return undefined
  const at = value.indexOf('@', 1)
  if (at < 0 || !rdxPackages.has(value.slice(0, at))) return undefined
  const versions = value
    .slice(at + 1)
    .split('||')
    .map((item) => item.trim())
  if (!versions.length || !versions.every((item) => version.test(item)))
    return undefined
  return { name: value.slice(0, at), versions }
}

/** Merge only exact RDX approvals already recorded by the user or pnpm. */
export async function normalizePnpmRdxApprovals(directory) {
  const filename = await workspaceFile(directory)
  if (!filename) return false
  const original = await readFile(filename, 'utf8')
  const document = parseDocument(original)
  if (document.errors.length)
    throw new Error(`Cannot read ${filename}: ${document.errors[0].message}`)
  const approvals = document.get('minimumReleaseAgeExclude', true)
  if (approvals === undefined) return false
  // Leave aliases and non-literal policy definitions to pnpm itself.
  if (
    !isSeq(approvals) ||
    approvals.items.some(
      (item) => !isScalar(item) || typeof item.value !== 'string'
    )
  )
    return false

  const groups = new Map()
  const removed = new Set()
  for (const node of approvals.items) {
    const rule = exactRule(node.value)
    if (!rule) continue
    const first = groups.get(rule.name)
    if (!first) {
      groups.set(rule.name, { node, versions: new Set(rule.versions) })
      continue
    }
    for (const value of rule.versions) first.versions.add(value)
    first.node.value = `${rule.name}@${[...first.versions].join(' || ')}`
    // Retain comments attached to approvals that are folded into the first rule.
    if (node.commentBefore)
      first.node.commentBefore = [first.node.commentBefore, node.commentBefore]
        .filter(Boolean)
        .join('\n')
    if (node.comment)
      first.node.comment = [first.node.comment, node.comment]
        .filter(Boolean)
        .join('\n')
    removed.add(node)
  }
  if (!removed.size) return false
  approvals.items = approvals.items.filter((node) => !removed.has(node))
  let updated = document.toString({ lineWidth: 0 })
  if (original.includes('\r\n')) updated = updated.replaceAll('\n', '\r\n')
  const temporary = path.join(
    path.dirname(filename),
    `.rdx-policy-${randomUUID()}.tmp`
  )
  try {
    const info = await lstat(filename)
    await writeFile(temporary, updated, { flag: 'wx', mode: info.mode })
    if (
      info.isSymbolicLink() ||
      (await readFile(filename, 'utf8')) !== original
    )
      throw new Error(
        `The pnpm policy changed during project creation: ${filename}. Retry without concurrent installs.`
      )
    await rename(temporary, filename)
  } finally {
    await rm(temporary, { force: true })
  }
  console.log(`Consolidated existing RDX version approvals in ${filename}.`)
  return true
}
