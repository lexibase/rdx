import { readFile, writeFile } from 'node:fs/promises'

function warningKey({ file, code, message }) {
  return JSON.stringify({ file, code, message })
}

export async function findNewWarnings(file, warnings) {
  let baseline
  try {
    baseline = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(
      `Could not read warning baseline "${file}": ${error.message}`
    )
  }
  if (
    baseline?.version !== 1 ||
    !Array.isArray(baseline.warnings) ||
    !baseline.warnings.every((entry) =>
      ['file', 'code', 'message'].every(
        (key) => typeof entry?.[key] === 'string' && entry[key].length > 0
      )
    )
  )
    throw new Error(
      `Invalid warning baseline "${file}". Expected a version 1 warning baseline.`
    )

  const counts = new Map()
  for (const entry of baseline.warnings) {
    const key = warningKey(entry)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return warnings.filter((warning) => {
    const key = warningKey(warning)
    const count = counts.get(key) ?? 0
    if (count === 0) return true
    counts.set(key, count - 1)
    return false
  })
}

export async function writeWarningBaseline(file, warnings) {
  const baseline = {
    version: 1,
    warnings: warnings
      .map(warningKey)
      .sort()
      .map((key) => JSON.parse(key)),
  }
  try {
    await writeFile(file, `${JSON.stringify(baseline, null, 2)}\n`, {
      flag: 'wx',
    })
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        `Warning baseline "${file}" already exists. Choose a new path.`
      )
    throw new Error(
      `Could not write warning baseline "${file}": ${error.message}`
    )
  }
}
