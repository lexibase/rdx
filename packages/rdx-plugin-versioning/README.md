# @lexibase/rdx-versioning

Optional version snapshots for RDX. Installing this package has no effect until
`versioning()` is added to `plugins` in `rdx.config.ts`.

For assisted installation, use `pnpm rdx add versioning` or
`npm exec -- rdx add versioning`. The RDX CLI installs the package, safely adds
the configuration and runs preparation. Manual configuration is also supported:

```ts
import { defineConfig } from '@lexibase/rdx-next'
import { versioning } from '@lexibase/rdx-versioning'

export default defineConfig({
  title: 'My documentation',
  plugins: [versioning()],
})
```

Run `pnpm rdx prepare` to initialize `versions.json`, then
`pnpm rdx version 1.0.0` to snapshot the current docs in
`versioned_docs/version-1.0.0/`. Read snapshots at `/docs/1.0.0/<page>`.
Current docs stay at `/docs/<page>`.

Manifest: `{ "active": ["1.0.0"], "archived": [] }`. To archive a version,
move its label to `archived` and retain its snapshot directory. Existing
snapshots are never overwritten. Removing the plugin does not delete content.

Options: `versionsFile` (default `versions.json`) and `versionsDir` (default
`versioned_docs`). Keep snapshots outside the live docs directory.
