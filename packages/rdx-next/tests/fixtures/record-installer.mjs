// Offline argv recorder: no registry access or dependency installation.
import { writeFile } from 'node:fs/promises'
import process from 'node:process'

await writeFile('installer-args.json', JSON.stringify(process.argv.slice(2)))
