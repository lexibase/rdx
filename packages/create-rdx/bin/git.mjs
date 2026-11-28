import { execFileSync } from 'node:child_process'
import path from 'node:path'

import fs from 'fs-extra'

function succeeds(command, args, cwd) {
  try {
    execFileSync(command, args, { cwd, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Creates a repository with an initial commit, as create-next-app does.
 * Returns false, leaving no `.git` behind, when Git is missing, the project is
 * already inside a Git or Mercurial repository, or any step fails.
 */
export function tryGitInit(root) {
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, stdio: 'ignore' })
  let initialized = false
  try {
    git('--version')
    if (
      succeeds('git', ['rev-parse', '--is-inside-work-tree'], root) ||
      succeeds('hg', ['--cwd', '.', 'root'], root)
    )
      return false
    git('init')
    initialized = true
    if (!succeeds('git', ['config', 'init.defaultBranch'], root))
      git('checkout', '-b', 'main')
    git('add', '-A')
    git('commit', '-m', 'Initial commit from create-rdx')
    return true
  } catch {
    // A failed commit (no Git identity, a rejecting hook) must not leave a
    // half-made repository.
    if (initialized) fs.removeSync(path.join(root, '.git'))
    return false
  }
}
