export type Versions = {
  active: string[]
  archived: string[]
  redirects?: Record<string, string>
}

export function major(version: string) {
  return BigInt(version.split('.')[0]!).toString()
}

/** Compare numeric components without rounding large version labels. */
export function compareVersions(first: string, second: string): number {
  const [a, ...aSuffix] = first.split('-')
  const [b, ...bSuffix] = second.split('-')
  const aParts = a!.split('.').map(BigInt)
  const bParts = b!.split('.').map(BigInt)
  for (let index = 0; index < 3; index++) {
    if (aParts[index]! !== bParts[index]!)
      return aParts[index]! > bParts[index]! ? 1 : -1
  }
  const aPre = aSuffix.join('-')
  const bPre = bSuffix.join('-')
  if (aPre === bPre) return 0
  if (!aPre || !bPre) return aPre ? -1 : 1
  const aIds = aPre.split('.')
  const bIds = bPre.split('.')
  for (let index = 0; index < Math.max(aIds.length, bIds.length); index++) {
    const left = aIds[index]
    const right = bIds[index]
    if (left === right) continue
    if (left === undefined || right === undefined)
      return left === undefined ? -1 : 1
    const leftNumeric = /^\d+$/.test(left)
    const rightNumeric = /^\d+$/.test(right)
    if (leftNumeric && rightNumeric) {
      if (BigInt(left) === BigInt(right)) continue
      return BigInt(left) > BigInt(right) ? 1 : -1
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    return left > right ? 1 : -1
  }
  return 0
}

/** Read older manifests as one edition per major without changing user files. */
export function consolidateVersions(input: Versions): Versions {
  const latest = new Map<string, string>()
  for (const version of [...input.active, ...input.archived]) {
    const previous = latest.get(major(version))
    if (!previous || compareVersions(version, previous) > 0)
      latest.set(major(version), version)
  }
  const redirects: Record<string, string> = { ...input.redirects }
  for (const version of [...input.active, ...input.archived]) {
    const target = latest.get(major(version))!
    if (target !== version) redirects[version] = target
  }
  for (const from of Object.keys(redirects)) {
    const visited = new Set([from])
    let target = redirects[from]!
    while (redirects[target]) {
      if (visited.has(target))
        throw new Error('Version redirects must not contain cycles.')
      visited.add(target)
      target = redirects[target]!
    }
    if (major(from) !== major(target) || ![...latest.values()].includes(target))
      throw new Error(
        `Version redirect "${from}" must target an edition of the same major.`
      )
    redirects[from] = target
  }
  return {
    active: input.active.filter(
      (version) => latest.get(major(version)) === version
    ),
    archived: input.archived.filter(
      (version) => latest.get(major(version)) === version
    ),
    ...(Object.keys(redirects).length ? { redirects } : {}),
  }
}
