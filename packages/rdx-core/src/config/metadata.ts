import { RdxConfigError } from './error.js'

/** Validate the portable SEO contract before Next starts or generates files. */
export function validateMetadata(input: unknown) {
  function string(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim())
      throw new RdxConfigError(`${field} must be a non-empty string.`)
    return value
  }
  function url(value: unknown, field: string, relative = false) {
    const source = string(value, field)
    try {
      if (/[\s\\]/.test(source)) throw new Error()
      if (relative && /^\/(?!\/)/.test(source)) return
      const parsed = new URL(source)
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error()
    } catch {
      throw new RdxConfigError(
        `${field} must be ${relative ? 'a root-relative path or ' : ''}an absolute http(s) URL.`
      )
    }
  }
  function object(value: unknown, field: string, allowed: string[]) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new RdxConfigError(`${field} must be an object.`)
    const result = value as Record<string, unknown>
    for (const key of Object.keys(result))
      if (!allowed.includes(key))
        throw new RdxConfigError(`unknown option ${field}.${key}.`)
    return result
  }
  function array(
    value: unknown,
    field: string,
    validate: (item: unknown, field: string) => void
  ) {
    if (!Array.isArray(value))
      throw new RdxConfigError(`${field} must be an array.`)
    value.forEach((item, index) => validate(item, `${field}[${index}]`))
  }
  const metadata = object(input, 'metadata', [
    'metadataBase',
    'applicationName',
    'since',
    'authors',
    'keywords',
    'icons',
    'manifest',
    'robots',
    'openGraph',
    'twitter',
  ])
  if (metadata.metadataBase !== undefined)
    url(metadata.metadataBase, 'metadata.metadataBase')
  string(metadata.applicationName, 'metadata.applicationName')
  if (
    metadata.since !== undefined &&
    (typeof metadata.since !== 'number' ||
      !Number.isInteger(metadata.since) ||
      metadata.since < 1 ||
      metadata.since > new Date().getFullYear())
  )
    throw new RdxConfigError(
      'metadata.since must be a positive integer no later than the current year.'
    )
  if (metadata.manifest !== undefined)
    url(metadata.manifest, 'metadata.manifest', true)
  if (metadata.keywords !== undefined)
    array(metadata.keywords, 'metadata.keywords', string)
  if (metadata.authors !== undefined)
    array(metadata.authors, 'metadata.authors', (value, field) => {
      const author = object(value, field, ['name', 'url'])
      string(author.name, `${field}.name`)
      if (author.url !== undefined) url(author.url, `${field}.url`)
    })
  if (metadata.icons !== undefined) {
    const icons = object(metadata.icons, 'metadata.icons', [
      'icon',
      'shortcut',
      'apple',
    ])
    for (const [key, value] of Object.entries(icons)) {
      if (value === undefined) continue
      const field = `metadata.icons.${key}`
      if (key === 'icon' && Array.isArray(value))
        array(value, field, (item, field) => {
          const icon = object(item, field, ['url', 'sizes', 'type'])
          url(icon.url, `${field}.url`, true)
          for (const key of ['sizes', 'type'])
            if (icon[key] !== undefined) string(icon[key], `${field}.${key}`)
        })
      else url(value, field, true)
    }
  }
  if (metadata.robots !== undefined) {
    const robots = object(metadata.robots, 'metadata.robots', [
      'index',
      'follow',
    ])
    for (const [key, value] of Object.entries(robots))
      if (value !== undefined && typeof value !== 'boolean')
        throw new RdxConfigError(`metadata.robots.${key} must be a boolean.`)
  }
  for (const key of ['openGraph', 'twitter']) {
    if (metadata[key] === undefined) continue
    const field = `metadata.${key}`
    const social = object(
      metadata[key],
      field,
      key === 'openGraph'
        ? ['title', 'description', 'siteName', 'locale', 'type', 'images']
        : ['title', 'description', 'card', 'site', 'creator', 'images']
    )
    for (const [name, value] of Object.entries(social)) {
      if (name === 'images' || value === undefined) continue
      string(value, `${field}.${name}`)
      if (
        (name === 'type' && value !== 'website') ||
        (name === 'card' &&
          !['summary', 'summary_large_image'].includes(value as string))
      )
        throw new RdxConfigError(`${field}.${name} has an unsupported value.`)
    }
    if (social.images !== undefined)
      array(social.images, `${field}.images`, (value, field) => {
        if (key === 'twitter') return url(value, field, true)
        const image = object(value, field, ['url', 'width', 'height', 'alt'])
        url(image.url, `${field}.url`, true)
        if (image.alt !== undefined) string(image.alt, `${field}.alt`)
        for (const dimension of ['width', 'height'])
          if (
            image[dimension] !== undefined &&
            (typeof image[dimension] !== 'number' ||
              !Number.isInteger(image[dimension]) ||
              (image[dimension] as number) <= 0)
          )
            throw new RdxConfigError(
              `${field}.${dimension} must be a positive integer.`
            )
      })
  }
}
