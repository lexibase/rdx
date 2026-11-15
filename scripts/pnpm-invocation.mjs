import assert from 'node:assert/strict'

export function pnpmInvocation(args) {
  const entry = process.env.npm_execpath
  assert.ok(entry, 'Run this command through pnpm.')
  return /\.[cm]?js$/i.test(entry)
    ? [process.execPath, [entry, ...args]]
    : [entry, args]
}
