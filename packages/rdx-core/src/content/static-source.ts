import matter from 'gray-matter'

/** Fresh, non-executable frontmatter parsing for read-only content validation. */
export function parseStaticDocument(source: string) {
  const text = source.replace(/^\uFEFF/, '')
  if (text.startsWith('---') && text[3] !== '-') {
    const language = matter.language(text).name.toLowerCase()
    if (language && !['yaml', 'yml', 'json'].includes(language))
      throw new Error(
        'rdx check accepts YAML or JSON frontmatter, without executing document code.'
      )
  }
  // gray-matter caches before parsing. A failed parse can otherwise appear
  // successful on the next call; explicit options bypass that shared cache.
  return matter(source, {})
}
