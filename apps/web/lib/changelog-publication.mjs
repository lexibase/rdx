const releasePackages = ['@lexibase/rdx', '@lexibase/create-rdx']

/** @param {string[]} versions */
export async function publishedChangelogVersions(
  versions,
  fetchMetadata = fetch
) {
  if (versions.length === 0) return []
  const packageVersions = await Promise.all(
    releasePackages.map(async (name) => {
      const response = await fetchMetadata(
        `https://registry.npmjs.org/${encodeURIComponent(name)}`,
        {
          headers: {
            Accept: 'application/vnd.npm.install-v1+json',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(10_000),
        }
      )
      if (!response.ok)
        throw new Error(
          `Could not verify changelog versions for ${name} (HTTP ${response.status}).`
        )
      const { versions } = await response.json()
      if (!versions || typeof versions !== 'object' || Array.isArray(versions))
        throw new Error(`The npm registry did not return versions for ${name}.`)
      return versions
    })
  )
  return versions.filter((version) =>
    packageVersions.every((versions) => Object.hasOwn(versions, version))
  )
}

export function visibleChangelogVersions() {
  // Next.js injects this value from next.config.js during the build.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const versions = process.env.RDX_VISIBLE_CHANGELOG_VERSIONS
  if (versions !== undefined) return versions.length ? versions.split(',') : []
}
