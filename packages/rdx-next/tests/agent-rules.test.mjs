import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  agentRulesEnd,
  agentRulesStart,
  formatAgentRules,
  refreshAgentRules,
} from '../bin/agent-rules.mjs'

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rdx-agent-rules-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const options = (root) => ({
  version: '9.1.0',
  docsDir: path.join(root, 'store', 'rdx', 'dist', 'docs'),
})

test('the managed block is refreshed while project text around it is kept', async (t) => {
  const root = await fixture(t)
  const file = path.join(root, 'AGENTS.md')
  await writeFile(
    file,
    `# Team rules\n\nKeep this.\n\n${agentRulesStart}\nold text\n${agentRulesEnd}\n\nAnd this.\n`
  )
  assert.equal(await refreshAgentRules(root, options(root)), true)
  const updated = await readFile(file, 'utf8')
  assert.match(updated, /^# Team rules\n\nKeep this\.\n\n<!-- BEGIN/)
  assert.match(updated, /<!-- END:rdx-agent-rules -->\n\nAnd this\.\n$/)
  assert.match(updated, /uses RDX 9\.1\.0/)
  assert.doesNotMatch(updated, /old text/)
  // Without an installed package link, the path points to the docs folder itself.
  assert.match(updated, /`store\/rdx\/dist\/docs\/index\.md`/)

  // An unchanged block is not rewritten.
  const before = (await stat(file)).mtimeMs
  assert.equal(await refreshAgentRules(root, options(root)), false)
  assert.equal((await stat(file)).mtimeMs, before)
})

test('the block points to the stable node_modules path and keeps CRLF endings', async (t) => {
  const root = await fixture(t)
  const installed = path.join(root, 'node_modules/@lexibase/rdx/dist/docs')
  await mkdir(installed, { recursive: true })
  await writeFile(path.join(installed, 'index.md'), '# Docs\n')
  const file = path.join(root, 'AGENTS.md')
  await writeFile(file, `${agentRulesStart}\r\n${agentRulesEnd}\r\n`)
  assert.equal(await refreshAgentRules(root, options(root)), true)
  const updated = await readFile(file, 'utf8')
  assert.match(updated, /`node_modules\/@lexibase\/rdx\/dist\/docs\/`/)
  assert.doesNotMatch(updated.replaceAll('\r\n', ''), /\n/)
})

test('the generated block is already formatted, so Prettier and RDX never rewrite each other', async () => {
  const { format } = await import('prettier')
  const block = `${formatAgentRules({ version: '9.1.0', docs: 'node_modules/@lexibase/rdx/dist/docs' })}\n`
  assert.equal(await format(block, { parser: 'markdown' }), block)
  const template = await readFile(
    new URL(
      '../../create-rdx/templates/default/AGENTS.md.template',
      import.meta.url
    ),
    'utf8'
  )
  assert.equal(await format(template, { parser: 'markdown' }), template)
})

test('projects without AGENTS.md or without both markers are left alone', async (t) => {
  const root = await fixture(t)
  assert.equal(await refreshAgentRules(root, options(root)), false)
  await assert.rejects(readFile(path.join(root, 'AGENTS.md')), /ENOENT/)
  for (const content of [
    '# Our own rules\n',
    `${agentRulesStart}\nno end marker\n`,
    `${agentRulesEnd}\n${agentRulesStart}\n`,
  ]) {
    await writeFile(path.join(root, 'AGENTS.md'), content)
    assert.equal(await refreshAgentRules(root, options(root)), false)
    assert.equal(await readFile(path.join(root, 'AGENTS.md'), 'utf8'), content)
  }
})
