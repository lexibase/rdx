# @lexibase/create-rdx

Create a documentation project using Next.js, Tailwind CSS and shadcn/ui (Base UI).
RDX is currently in beta; the stable release has not been published yet.

```sh
npm create @lexibase/rdx@beta
# Or: pnpm create @lexibase/rdx@beta
```

The prompt asks for the project name. That name becomes a new directory inside
the current directory. You can also pass it directly:

```sh
npm create @lexibase/rdx@beta my-docs
pnpm create @lexibase/rdx@beta my-docs
```

Use a short name starting with a letter or number, followed by letters, numbers,
dots, dashes or underscores. Paths, spaces, trailing dots and Windows/npm reserved
names are rejected. The folder keeps its original capitalization; only the
`package.json` name is lowercased. Existing paths are never reused or overwritten.

Options (forward them after `--` when using npm create):

```sh
npm create @lexibase/rdx@beta -- --help
npm create @lexibase/rdx@beta -- --version
npm create @lexibase/rdx@beta my-docs -- --skip-install
```

`--skip-install` creates the files without installing dependencies or preparing
`.rdx/`. Otherwise, RDX installs with the invoking npm, pnpm or Yarn and prepares
the runtime. Follow the commands printed by the generator.

If installation or preparation fails, the command exits with an error and keeps
the generated files. Fix the reported problem, enter the created folder and retry
installation/development using the same package manager. Do not rerun creation
over that directory, delete lockfiles or disable security policies automatically.

See the generated README for development, public files and optional versioning.
