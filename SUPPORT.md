# RDX 1.0 support policy

## Node.js

The framework, public packages, creator and generated projects require:

```text
^22.18.0 || ^24.11.0
```

Use the latest patch of Node.js 22.x or 24.x. Node 20, odd-numbered majors and
Node 26+ are outside this first stable release's supported engine range.
Future Node lines can be added after validation; accepting a toolchain's wider
engine range does not itself certify RDX on those versions.

## Tested environments

| Environment                | Automated validation                                    |
| -------------------------- | ------------------------------------------------------- |
| Ubuntu / Node 22 / pnpm 9  | Workspace checks and installed archive production tests |
| Windows / Node 24 / pnpm 9 | Workspace checks and installed archive production tests |

The CI uses current patches within each major. It does not exercise every OS,
Node patch or package-manager combination. macOS is not part of this matrix.

The creator and plugin installer recognize npm, pnpm and Yarn. pnpm 9 is the
automated release baseline. npm and Yarn are not certified by the complete CI
installation matrix; verify their real registry flows before advertising the
same coverage. Do not mix lockfiles in one generated project.

## Framework and public API

RDX 1.0 uses Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui Base UI.
The exact constraints live in each package manifest and the generated template.
The template pins the tested main framework version. Its dependencies select
compatible internal runtime and UI versions. Updates are explicit;
running the creator again is not an update strategy for an existing project.

The supported surface is documented in [PUBLIC_API.md](./PUBLIC_API.md).
Private source paths, generated `.rdx/` internals, DOM structure and CSS class
names are not a stable extension API. Public 1.x API changes follow semantic
versioning; incompatible changes require a new major.

## Production

The baseline is a complete project installed and built on its destination host.
Local release tests run the installed production CLI, not workspace source links.
Vercel has been validated with a standalone generated test project and the
official native Next.js website. These are different deployment roots; follow
[DEPLOYMENT.md](./DEPLOYMENT.md) and the website README.

Static export, minimal standalone images, read-only filesystems and every
possible hosting provider are not certified by these checks.

## Trust boundaries

Configuration, plugins and project-owned React components are trusted code.
MDX expression blocking is enabled; it is not a sandbox for untrusted uploads.
Documentation, search indexes and everything in `public/` are publicly readable.
Archived documentation is not private or access-controlled.
