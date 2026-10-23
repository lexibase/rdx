# `@lexibase/rdx-core`

Content RDX core.

Plugin setup may return `runtimeFiles: string[]` alongside `sources`. Each entry
names a project-relative file required when serving documentation, such as a
custom version manifest. Paths cannot be absolute, escape the project or name
the project root. Entries are deduplicated in `RdxProject.runtimeFiles`.
The Next adapter validates and explicitly includes these files in production
traces; undeclared unrelated files are not automatically deployment assets.
