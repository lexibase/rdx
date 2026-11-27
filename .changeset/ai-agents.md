---
'@lexibase/rdx': minor
'@lexibase/create-rdx': minor
'@lexibase/rdx-next': minor
'@lexibase/rdx-core': patch
---

Point AI coding agents to the documentation of the installed RDX version.

- `@lexibase/rdx` ships its documentation as Markdown in `dist/docs/`, with an
  `index.md` that lists every page.
- New projects include an `AGENTS.md` whose RDX section is refreshed by
  `rdx dev`, `build`, `start` and `prepare`. `create-rdx --no-agents-md` skips
  the file.
- Sites publish `/llms.txt` at the root and an index per published edition at
  `/docs/<edition>/llms.txt`.
- `rdx check` recognizes links to these indexes.
