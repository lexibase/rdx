function editDistance(first: string, second: string) {
  let row = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let i = 0; i < first.length; i++) {
    const next = [i + 1]
    for (let j = 0; j < second.length; j++)
      next.push(
        Math.min(
          next[j]! + 1,
          row[j + 1]! + 1,
          row[j]! + Number(first[i] !== second[j])
        )
      )
    row = next
  }
  return row[second.length]!
}

/** A unique close match is safer to suggest than an arbitrary tie. */
export function closestMatch<T>(
  value: string,
  candidates: Iterable<T>,
  name: (candidate: T) => string
) {
  if (!value || value.length > 120) return
  const limit = value.length < 4 ? 0 : value.length < 9 ? 1 : 2
  let best: T | undefined
  let bestDistance = limit + 1
  for (const candidate of candidates) {
    const label = name(candidate)
    if (Math.abs(label.length - value.length) > limit) continue
    const distance = editDistance(value.toLowerCase(), label.toLowerCase())
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    } else if (distance === bestDistance) {
      best = undefined
    }
  }
  return best
}
