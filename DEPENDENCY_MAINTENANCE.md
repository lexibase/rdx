# Dependency maintenance — security baseline

This maintenance step keeps Next.js 15 and the existing RDX layout. It does not
publish new RDX package versions.

- Next.js and its ESLint plugin: 15.5.28.
- React/React DOM: 19.3.1; React type declarations: 19.3.0.
- Tailwind and its PostCSS adapter: 4.3.3; direct PostCSS: 8.5.31.
- MDX renderer: next-mdx-remote 6.0.0 with JavaScript expression blocking enabled.
- Minimum Node.js for the site/runtime/generator: 20.9 (required by the updated
  image-processing dependency); Tailwind's native compiler also requires Node 20.
- Compatible transitive updates are recorded in pnpm-lock.yaml.

## Audit results and remaining work

The production audit (`pnpm audit --prod`) went from 67 advisories (4 critical,
35 high, 26 moderate, 2 low) to 5 (0 critical, 2 high, 3 moderate).
Counts are a point-in-time dependency scan, not proof of exploitation or of
application-level reachability. The full audit, including development tools,
reports 37 advisories (0 critical, 23 high, 12 moderate, 2 low). These are not
additional to the production count: they include the same five production alerts.
Tooling advisories include Turbo, esbuild, ESLint-related and glob dependencies;
they still need a separate tooling-update pass. This is not a full remediation.

Four remaining advisories concern PostCSS 8.4.31 pinned by Next.js 15.5.28.
RDX's own PostCSS pipeline uses 8.5.31, but both versions are installed. Replacing
this dependency only through a monorepo override would not fix projects created
outside the workspace. Address this in the planned Next.js 16 migration and
recheck the version resolved by a freshly installed generated project.

The remaining moderate advisory concerns sprintf-js, used by argparse 1 via
js-yaml 3 and gray-matter. No fixed sprintf-js release is currently reported.
Review replacing/configuring the frontmatter parser in a separate compatibility
step; do not force argparse 2 into js-yaml 3 through an incompatible override.

The upstream next-mdx-remote repository is archived. Version 6 provides the
available expression-blocking fix; evaluate a maintained replacement separately,
with rendering/component compatibility tests before changing the MDX pipeline.

Until the remaining advisories are resolved, do not describe the audit as clean.
