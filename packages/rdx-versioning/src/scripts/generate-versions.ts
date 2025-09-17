import fs from 'fs'
import path from 'node:path'

const baseDir = path.join(process.cwd(), 'app/docs')
const versionDir = path.join(baseDir, '(versioned)')
const archivedDir = path.join(baseDir, '(archived)')
const outputPath = path.join(process.cwd(), 'versions.json')
const versionValidate = /^version-(\d+(\.\d+)*)$/

console.log('[versioning] CWD:', process.cwd())
console.log('[versioning] Output path:', outputPath)

function getVersionsFrom(dir: string): string[] {
  if (!fs.existsSync(dir)) return []

  const folders = fs.readdirSync(dir)
  return folders
    .filter((folder) => versionValidate.test(folder))
    .map((folder) => folder.replace('version-', ''))
    .sort((a, b) =>
      b.localeCompare(a, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    )
}

const activeVersions = getVersionsFrom(versionDir)
const archivedVersions = getVersionsFrom(archivedDir)

const newContent = JSON.stringify(
  {
    active: activeVersions,
    archived: archivedVersions,
  },
  null,
  2
)

const currentContent = fs.existsSync(outputPath)
  ? fs.readFileSync(outputPath, 'utf-8')
  : ''

if (currentContent !== newContent) {
  const parsed = currentContent ? JSON.parse(currentContent) : {}
  const previous: { active: string[]; archived: string[] } = {
    active: Array.isArray(parsed.active) ? parsed.active : [],
    archived: Array.isArray(parsed.archived) ? parsed.archived : [],
  }

  const addedActive = activeVersions.filter((v) => !previous.active.includes(v))
  const removedActive = previous.active.filter(
    (v) => !activeVersions.includes(v)
  )

  const addedArchived = archivedVersions.filter(
    (v) => !previous.archived.includes(v)
  )
  const removedArchived = previous.archived.filter(
    (v) => !archivedVersions.includes(v)
  )

  fs.writeFileSync(outputPath, newContent)

  console.log(`[versioning] "versions.json" updated.`)

  if (addedActive.length || removedActive.length) {
    console.log('\n[versioning] Active versions changed:')
    addedActive.forEach((v) => console.log(` + ${v}`))
    removedActive.forEach((v) => console.log(` - ${v}`))
  }

  if (addedArchived.length || removedArchived.length) {
    console.log('\n[versioning] Archived versions changed:')
    addedArchived.forEach((v) => console.log(` + ${v}`))
    removedArchived.forEach((v) => console.log(` - ${v}`))
  }

  console.log('')
} else {
  console.log('\n[versioning] "versions.json" is up to date. No changes made.')
}
