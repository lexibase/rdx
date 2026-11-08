# @lexibase/create-rdx

Create a documentation project using Next.js, Tailwind CSS and shadcn/ui Base UI.

Requires Node.js 22.18+ (22.x) or 24.11+ (24.x), preferably the latest patch.
See the [installation requirements](https://github.com/lexibase/rdx/blob/main/apps/web/docs/02-getting-started/installation.mdx#requirements) and [CI matrix](https://github.com/lexibase/rdx/blob/main/apps/web/docs/05-guides/development.mdx#pull-request-checks).

## Installation

```sh
npm create @lexibase/rdx@latest
# Or: pnpm create @lexibase/rdx@latest
```

The prompt asks for the project name, which becomes a new directory inside
the current directory. You can also pass it directly:

```sh
npm create @lexibase/rdx@latest my-docs
pnpm create @lexibase/rdx@latest my-docs
```

Use a short name starting with a letter or number, followed by letters, numbers,
dots, dashes or underscores. Paths, spaces, trailing dots and Windows/npm reserved
names are rejected. The folder keeps its capitalization; the npm package name
is lowercased. Existing paths are never reused or overwritten.

## Options

Forward options after `--` when using npm create:

```sh
npm create @lexibase/rdx@latest -- --help
npm create @lexibase/rdx@latest -- --version
npm create @lexibase/rdx@latest my-docs -- --skip-install
```

`--skip-install` creates source files without installing dependencies or preparing
`.rdx/`. Otherwise the creator uses the invoking package manager and prepares
the runtime. Follow the commands printed by the generator.

The creator reports file creation, dependency installation, and runtime preparation
as separate stages, with elapsed time and periodic activity messages during long
operations. During pnpm installation, RDX shows a rotating activity indicator and
a bar based on the number of packages linked. Resolution, cache and download
counts come from pnpm's structured logs; the bar waits for a known package total.
Warnings, errors and lifecycle output remain visible. Logs without a terminal use
plain status lines instead of animation. npm and Yarn retain their native output.
npm and pnpm projects
prepare using their installed RDX executable directly; Yarn provides its project
execution environment for Plug'n'Play compatibility.

## Recovery

In a pnpm workspace, installation uses the workspace's existing dependencies and
policy. Before installation and runtime preparation, the creator consolidates
duplicate exact-version approvals for RDX in `minimumReleaseAgeExclude`. Only
versions already listed are combined; the age threshold, strict mode, unrelated
package rules, comments and other workspace settings are preserved.

If installation or preparation fails, the command exits with an error and keeps
the generated files. Fix the reported issue, enter the created folder and retry
installation/development using the same package manager. Do not rerun creation
over that directory, delete lockfiles or disable security policies automatically.

See the generated README for development, public files and optional versioning.
