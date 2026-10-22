# {{RDX_PROJECT_NAME}}

This documentation site was created with RDX.

## Development

```bash
pnpm dev
```

Edit files in `docs/` to create your documentation. RDX creates and maintains
its internal runtime in `.rdx/`.

## Optional versioning

```bash
pnpm rdx add versioning
pnpm rdx version 1.0.0
```

The first command installs the official plugin, activates it in `rdx.config.ts`
and prepares the runtime. It preserves existing options and saves a backup
before changing the configuration. Restart `pnpm dev` afterward. Repeated
activation does not duplicate the plugin or upgrade its installed version.
If the configuration is too dynamic to edit safely, follow the manual
instructions printed by the CLI. Installing a package alone does not activate it.

## Public files

Put images and downloads in the project-root `public/` folder:

```text
public/images/rdx.svg        → /images/rdx.svg
public/downloads/example.txt → /downloads/example.txt
```

Use site-root URLs in MDX:

```md
![RDX logo](/images/rdx.svg)

[Download](/downloads/example.txt)
```

See `docs/examples/images.mdx` for a working example. Do not include `/public`
in URLs and do not store private files or credentials in this directory.

RDX connects `.rdx/public` to this folder automatically. Keep your files in
`public/`; `.rdx/` is generated. All documentation versions share public files;
use version-specific filenames if snapshots need to retain their original assets.

For production, run `pnpm build` and `pnpm start`. Restart/redeploy the site after
adding or removing public files in production. Deploy `public/` with the project,
not just `.rdx/`. If the filesystem does not support directory links, RDX reports
an error without deleting the original assets.
