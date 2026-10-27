type Entry = { name: string; children: Entry[] }

const branch = /^([ \t|│]*)(\|-|\|_|├──|└──)(?:[ \t]+(.*))?$/
const guide = /^[ \t|│]*[|│][ \t|│]*$/

/** Convert diagram prefixes only; pipes within filenames remain literal. */
function explicitTree(source: string): string | undefined {
  const lines = source.split(/\r?\n/)
  if (!lines.some((line) => branch.test(line) || guide.test(line))) return
  return lines
    .map((line) => {
      const match = line.match(branch)
      if (match) {
        const prefix = match[1]!.replaceAll('|', '│').replaceAll('\t', '    ')
        const connector =
          match[2] === '|-' ? '├──' : match[2] === '|_' ? '└──' : match[2]
        return `${prefix}${connector}${match[3] ? ' ' + match[3].trimEnd() : ''}`
      }
      return guide.test(line)
        ? line.replaceAll('|', '│').replaceAll('\t', '    ')
        : line.trimEnd()
    })
    .join('\n')
}

/** Indented lists and explicit diagrams are text only; no files are accessed. */
export function formatFolderTree(source: string): string {
  const diagram = explicitTree(source)
  if (diagram !== undefined) return diagram
  const roots: Entry[] = []
  const parents: Entry[] = []
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue
    const indentation = line.match(/^[ \t]*/)?.[0].replaceAll('\t', '  ') ?? ''
    const depth = indentation.length / 2
    if (!Number.isInteger(depth) || depth > parents.length)
      throw new Error(
        `Invalid folder fence at line ${index + 1}: use two spaces per level without skipping levels.`
      )
    const parent = parents[depth - 1]
    if (parent && !parent.name.endsWith('/'))
      throw new Error(
        `Invalid folder fence at line ${index + 1}: parent folders must end with /.`
      )
    const entry: Entry = { name: line.trim(), children: [] }
    const siblings = parent ? parent.children : roots
    siblings.push(entry)
    parents.length = depth
    parents.push(entry)
  }
  const lines: string[] = []
  function draw(entries: Entry[], prefix: string, root = false) {
    entries.forEach((entry, index) => {
      const last = index === entries.length - 1
      lines.push(
        root ? entry.name : `${prefix}${last ? '└── ' : '├── '}${entry.name}`
      )
      draw(entry.children, root ? '' : prefix + (last ? '    ' : '│   '))
    })
  }
  draw(roots, '', true)
  return lines.join('\n') + (source.endsWith('\n') ? '\n' : '')
}
