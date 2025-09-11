import fs from 'fs'
import path from 'node:path'

const versionDir = path.join(process.cwd(), 'app/docs/(versioned)')
const outputPath = path.join(process.cwd(), 'versions.json')
const versionValidate = /^version-(\d+(\.\d+)*)$/

console.log('[versioning] CWD:', process.cwd())
console.log('[versioning] Output path:', outputPath)

if (!fs.existsSync(versionDir)) {
  console.warn(
    '[versioning] Folder "versioned" not found. Creating empty folder and version.json.'
  )
  fs.mkdirSync(versionDir, { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2))
  process.exit(0)
}

const folders = fs.readdirSync(versionDir)

const invalidFolders: string[] = []
const validVersions = folders
  .filter((folder) => {
    const isValid = versionValidate.test(folder)
    if (!isValid) invalidFolders.push(folder)
    return isValid
  })
  .map((folder) => folder.replace('version-', ''))
  .sort((a, b) =>
    b.localeCompare(a, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  )

if (invalidFolders.length > 0) {
  console.error(
    '\n[versioning] Invalid folder name(s) detected in "versioned" folder.\n' +
      'The following folders do not match the required format "version-<numberVersion>":\n'
  )
  invalidFolders.forEach((folder) => console.error(` - ${folder}`))
  console.error(
    '\nSolution: Rename these folders to follow the format "version-<numberVersion>" (e.g. version-1.0.0).\n' +
      'The script will not continue until all folder names are valid.\n'
  )
  process.exit(1)
}

const newContent = JSON.stringify(validVersions, null, 2)
const currentContent = fs.existsSync(outputPath)
  ? fs.readFileSync(outputPath, 'utf-8')
  : ''

if (currentContent !== newContent) {
  fs.writeFileSync(outputPath, newContent)
  console.log(
    `[versioning] "versions.json" updated with ${validVersions.length} version(s).`
  )
} else {
  console.log('[versioning] "versions.json" is up to date. No changes made.')
}
