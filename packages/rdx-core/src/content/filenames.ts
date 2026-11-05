import path from 'node:path'

export const documentExtension = /\.mdx?$/
export const DEFAULT_POSITION = Number.MAX_SAFE_INTEGER

export function orderedName(name: string) {
  const match = /^(\d{2})-(.+)$/.exec(name)
  return match && match[2] !== '.' && match[2] !== '..'
    ? { name: match[2]!, position: Number(match[1]) }
    : { name, position: DEFAULT_POSITION }
}

export function slugFromRelativePath(relativePath: string) {
  return relativePath
    .replace(documentExtension, '')
    .split(path.sep)
    .map((segment) => orderedName(segment).name)
    .join('/')
}
