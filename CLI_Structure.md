# Project and documentation structure

The generator creates a content-first project, backed by the RDX Next runtime:

```text
my-docs/
├── docs/
│   └── guides/
│       ├── _category.json
│       └── intro.mdx
├── public/
├── rdx.config.ts
├── package.json
├── .gitignore
└── README.md
```

The runtime generates its internal application in `.rdx/`; users do not edit that
directory. Create a project with `pnpm create @lexibase/rdx@beta` while releases
remain in the beta channel.

## Optional versioning

Inside a generated project, install and configure the plugin with
`pnpm rdx add versioning`, then snapshot the current documentation with
`pnpm rdx version 1.0.0`.

```text
my-docs/
├── docs/                         # Current, editable content
├── versioned_docs/
│   └── version-1.0.0/            # Snapshot, preserving category/file structure
├── versions.json
└── rdx.config.ts
```

The manifest contains `active` and `archived` arrays. Archiving an existing
snapshot means moving its identifier between those arrays, not moving its files.
There is no `archive-rdx` command. Installing without configuring the plugin does
not activate versioning.

## Official development website

`apps/web` uses the same local core, configuration contract, versioning plugin
and content layout. It remains a native Next application for developing the site
and shared components; it does not generate another application in `.rdx/`.

Its historical live URL stays `/docs/canary`, and published/archived URLs remain
`/docs/<version>`. The physical storage no longer lives inside App Router groups.

Run `pnpm dev` from the monorepo root for automatic local package rebuilds.
To snapshot the official website, use `pnpm --filter web docs:version <version>`.
See [apps/web/README.md](./apps/web/README.md) for the full workflow.
