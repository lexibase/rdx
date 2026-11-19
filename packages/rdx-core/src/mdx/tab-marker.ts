type TitleNode = {
  type: string
  value?: string
  position?: { start: { offset?: number }; end: { offset?: number } }
}

/** Only the literal suffix opts in; escaped braces, entities and code stay text. */
export function hasDisabledTabMarker(
  children: readonly TitleNode[],
  source: string
) {
  const marker = children.at(-1)
  if (!marker) return false
  const raw = source.slice(
    marker.position?.start.offset,
    marker.position?.end.offset
  )
  if (marker.type === 'mdxTextExpression') {
    const previous = children.at(-2)
    return (
      marker.value === 'disabled' &&
      raw === '{disabled}' &&
      (!previous ||
        (previous.type === 'text' && /\s$/.test(previous.value ?? '')))
    )
  }
  return (
    marker.type === 'text' &&
    /(?:^|\s)\{disabled\}[ \t]*$/.test(marker.value ?? '') &&
    /(?:^|\s)\{disabled\}[ \t]*$/.test(raw)
  )
}
