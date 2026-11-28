---
'@lexibase/create-rdx': minor
---

New projects start as a Git repository with an initial commit, created after
installation so it includes the lockfile and the filled `AGENTS.md`. The creator
skips this step inside an existing Git or Mercurial repository, without Git, or
when the commit fails, leaving no `.git` behind. `--no-git` opts out.
