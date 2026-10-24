# @lexibase/create-rdx

Create a documentation project using Next.js, Tailwind CSS and shadcn/ui Base UI.

Requires Node.js 22.18+ (22.x) or 24.11+ (24.x), preferably the latest patch.
See the repository's SUPPORT.md for the automated platform/package-manager matrix.

## Stable installation

Use the stable channel when it is published:

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

The unscoped `create-rdx` is a different project. Evaluation releases remain
available through explicit channels such as `@beta`; they are not stable updates.

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

## Recovery

If installation or preparation fails, the command exits with an error and keeps
the generated files. Fix the reported issue, enter the created folder and retry
installation/development using the same package manager. Do not rerun creation
over that directory, delete lockfiles or disable security policies automatically.

See the generated README for development, public files and optional versioning.
