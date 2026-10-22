# Dependency maintenance — security baseline

This maintenance step migrates to Next.js 16 and keeps the existing RDX layout. It does not
publish new RDX package versions.

- Next.js and its ESLint plugin: 16.4.2.
- React/React DOM: 19.3.1; React type declarations: 19.3.0.
- Tailwind and its PostCSS adapter: 4.3.3; direct PostCSS: 8.5.31.
- MDX renderer: next-mdx-remote 6.0.0 with JavaScript expression blocking enabled.
- Minimum Node.js for the site/runtime/generator: 20.9 (required by Next.js 16
  and the image-processing dependency); Tailwind's native compiler also requires Node 20.
- Compatible transitive updates are recorded in pnpm-lock.yaml.

## Audit results and remaining work

The production audit (`pnpm audit --prod`) went from 67 advisories (4 critical,
35 high, 26 moderate, 2 low) to 5 after the Next.js 15 security update, then to
1 moderate advisory after the Next.js 16 migration (0 critical, 0 high).
Counts are a point-in-time dependency scan, not proof of exploitation or of
application-level reachability. The full audit, including development tools,
reports 33 advisories (0 critical, 21 high, 10 moderate, 2 low). These are not
additional to the production count: they include the same production alert.
Tooling advisories include Turbo, esbuild, ESLint-related and glob dependencies;
they still need a separate tooling-update pass. This is not a full remediation.

The four PostCSS advisories from Next.js 15's pinned 8.4.31 are resolved by
Next.js 16.4.2, which depends on PostCSS 8.5.23. RDX's own pipeline uses 8.5.31.
This fix is carried by the generated project's Next.js dependency, not by a
monorepo-only override.

## Next.js 16 integration

- Development and production builds both use the default Turbopack bundler.
- `apps/web` runs ESLint directly with zero warnings allowed. Next.js no longer
  runs lint during builds; `pnpm check` retains the explicit lint step.
- `next typegen` runs before the development website's standalone type check.
- Shared/generated TypeScript options use `react-jsx` and include dev route types.
- The generated runtime's Turbopack root is the user's project directory, not
  `.rdx/`, so project-owned configuration and homepage components are included.
- The shared UI exports a small CommonJS PostCSS adapter. The PostCSS worker
  loads Tailwind and its native dependencies directly rather than bundling them
  into the app. Consumers do not need to configure Tailwind themselves.
- The legacy development website traces its MDX/category files explicitly,
  avoiding whole-repository tracing from its dynamic version-folder reads.
- Build caches exclude `.next/dev/`. Next.js automatic agent-rule generation is
  disabled; RDX does not add unrelated instruction files to consumer projects.

The workspace-linked integration fixture widens its Turbopack root only inside
the test harness, because its dependencies point outside the fixture. Generated
projects retain their own root; a CLI test asserts this boundary.

Validation also covered local tarballs installed into an isolated generated
project, without workspace package links or a bundler-root override: custom
homepage, live/snapshot MDX and public assets worked in development and production.
That fresh resolution surfaced upstream peer warnings in newer Radix/Floating UI
transitives (`@radix-ui/react-primitive` 2.2.0 and `@floating-ui/react-dom` 2.1.9
declare exact React/React DOM 19.1.0 peers, while RDX uses 19.3.1). Keep these
visible for the UI dependency pass; do not hide them with global peer overrides.

The remaining moderate advisory concerns sprintf-js, used by argparse 1 via
js-yaml 3 and gray-matter. No fixed sprintf-js release is currently reported.
Review replacing/configuring the frontmatter parser in a separate compatibility
step; do not force argparse 2 into js-yaml 3 through an incompatible override.

The upstream next-mdx-remote repository is archived. Version 6 provides the
available expression-blocking fix; evaluate a maintained replacement separately,
with rendering/component compatibility tests before changing the MDX pipeline.

Until the remaining advisories are resolved, do not describe the audit as clean.
