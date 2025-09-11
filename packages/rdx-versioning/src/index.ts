export type VersionMeta = {
  label: string
  icon: 'bird' | 'packageOpen' | 'archive'
}

function inferIcon(label: string): VersionMeta['icon'] {
  return label <= '1.0.0' ? 'archive' : 'packageOpen'
}

export function getParsedVersions(versionsRaw: string[]): {
  canary: VersionMeta
  active: VersionMeta[]
  archived: VersionMeta[]
} {
  const parsed = versionsRaw.map(
    (label): VersionMeta => ({
      label,
      icon: inferIcon(label),
    })
  )

  const current = parsed[0] ?? { label: '0.0.0', icon: 'packageOpen' }
  const rest = parsed.slice(1)

  const active = rest.filter((v) => v.icon === 'packageOpen')
  const archived = rest.filter((v) => v.icon === 'archive')

  return {
    canary: { label: 'canary', icon: 'bird' },
    active: [current, ...active],
    archived,
  }
}
