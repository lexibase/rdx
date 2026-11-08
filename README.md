<div style="width: 100%;">
  <img src="./README.svg" style="width: 100%;" alt="rdx">
</div>

<div align="center">

[![created by](https://img.shields.io/badge/Created%20By-DuHNunes-0a0a0a?style=flat)](https://github.com/duhnunes)
[![license](https://img.shields.io/badge/license-MIT-green?style=flat)](./LICENSE)

</div>

## About

**RDX** is a tool for building documentation with **Markdown and MDX** in a friendly and focused way — fast, easy, and built for clarity.
Crafted with **Next.js**, **TailwindCSS**, and **shadcn/ui**, it delivers a sleek and modern design out of the box.

## Using RDX

Create a documentation project with `pnpm create @lexibase/rdx@latest`.
Generated projects use `@lexibase/rdx` as their framework dependency. Update an
existing project with `pnpm add @lexibase/rdx@latest`, then review release notes
and rebuild. Optional plugins are installed and updated separately.

## Development

Run `pnpm install` and then `pnpm dev` from the repository root. This starts the
development website with local workspace packages, initial dependency builds and
automatic recompilation of compiled packages. UI components are consumed directly
from source. No npm publication is needed to preview package changes.
Press Ctrl+C once to stop the development server and its owned watchers. The local
Node coordinator keeps initial builds cached through Turbo and avoids Windows
package-manager batch prompts for long-running tasks; real failures remain nonzero.
See [apps/web/README.md](./apps/web/README.md) for the local workflow.

See the [development guide](./apps/web/docs/05-guides/development.mdx#pull-request-checks) for local checks and automatic pull request validation.

`pnpm install` activates the repository's Husky hooks. Before a commit, Prettier
checks only staged files in supported formats; it does not rewrite files or stage
additional changes. Run `pnpm format:check` to repeat that check. The manual
`pnpm format` command formats all matching TypeScript and Markdown files in the
repository. Commit messages are validated against Conventional Commits, for
example `fix(ui): correct mobile spacing`.

See [PUBLISHING.md](./PUBLISHING.md) for release preparation and npm publishing.
The public API is documented in [PUBLIC_API.md](./PUBLIC_API.md).
See the [installation requirements](./apps/web/docs/02-getting-started/installation.mdx#requirements)
and [deployment guide](./apps/web/docs/05-guides/deployment.mdx). Release notes are in [CHANGELOG.md](./CHANGELOG.md).

## License

RDX code is licensed under [MIT](./LICENSE). Official documentation prose is
licensed under [CC BY 4.0](./LICENSE-docs).

Code examples, configuration snippets and CLI starter templates (including their
sample MDX files) remain MIT. These licenses do not assign a license to the
independent documentation you write with RDX. Third-party material retains its
own license. See [LICENSE-docs](./LICENSE-docs) for the documentation scope and
attribution.
