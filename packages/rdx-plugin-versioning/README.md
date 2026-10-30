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
  metadata: { applicationName: 'My documentation' },
  plugins: [versioning()],
})
```

Run `pnpm rdx prepare` to initialize `versions.json`, then
`pnpm rdx version 1.0.0` to snapshot the current docs in
`versioned_docs/version-1.0.0/`. Read snapshots at `/docs/1.0.0/<page>`.
Current docs stay at `/docs/<page>`.

Run `pnpm rdx version 1.1.0` when the next release is ready. It publishes the
current `docs/` content and replaces `1.0.0` in the dropdown. Patch and minor
releases advance that same major edition; a new major adds another edition and
keeps the final content of previous majors. Versions must advance, and a label
cannot be reused. Pre-releases also update the edition of their major.

The optional `redirects` map in `versions.json` is maintained by the commands:
`{ "active": ["1.1.0"], "archived": [], "redirects": { "1.0.0": "1.1.0" } }`.
Historical URLs redirect to the latest edition in their major, keeping the page
path. Removed pages return 404. Previous files remain on disk, but no longer
appear as separate editions or search indexes. Keep the redirect map in Git.
The live documentation remains independent of published editions.

After publishing `1.1.0`, run `pnpm rdx archive 1.1.0` to archive that edition and
`pnpm rdx unarchive 1.1.0` to restore it at the end of the active list.
Both commands retain the snapshot directory and URLs. Entries can also be moved
manually between the two arrays. Existing
snapshots are never overwritten. Removing the plugin does not delete content.

Options: `versionsFile` (default `versions.json`) and `versionsDir` (default
`versioned_docs`). Keep snapshots outside the live docs directory.

The plugin declares its manifest through `runtimeFiles` so the Next adapter
includes custom manifest paths in production deployments together with active
and archived documentation snapshots. Updating an archived major preserves its
archived state until explicitly restored.

Plugins can declare extra snapshot trees and metadata through the synchronous
`snapshot` contribution hook. Versioning validates every destination, reserves
new paths exclusively, copies all contributions, then commits the version
manifest. A failure rolls back only the new snapshot directories. Existing
snapshots and pre-existing destinations are never overwritten.

The optional language plugin uses this lifecycle for multilingual editions.
Versioning does not import or depend on that plugin; each also works alone.
