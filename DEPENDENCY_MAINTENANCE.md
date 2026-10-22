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

## Development toolchain

- TypeScript: 6.0.3 across the workspace, runtime configuration editor and
  generated projects. TypeScript 7 is not used yet: the current ESLint parser
  supports TypeScript below 6.1, and the CLI needs the JavaScript compiler API.
- Build tooling: Tsup 9.0.0, esbuild 0.28.2 and Turbo 2.11.10.
- Formatting/hooks: Prettier 3.9.10 and Husky 9.1.7. The hook command is unchanged;
  installation uses `husky`, without the deprecated v8 hook bootstrap.
- Lint: ESLint/@eslint/js 9.39.5, typescript-eslint 8.72.0, React Hooks 7.1.1,
  Turbo's ESLint plugin 2.11.10 and compatible updated supporting packages.
- ESLint 9 is an interim compatibility constraint, not the current upstream
  release line: `eslint-plugin-react` 7.37.5 and `eslint-plugin-import` 2.32.0 do
  not declare ESLint 10 support. Revisit this migration rather than forcing peers.
- Development requires Node `^22.18.0 || ^24.11.0 || >=26.0.0` because of Tsup 9.
  This applies to contributors building the monorepo, not to generated projects;
  the public runtime and template still require Node >=20.9.

TypeScript 6 configs explicitly select ambient types and root directories,
including shared workspace sources and project-owned `home.tsx`/configuration
outside `.rdx/`. No `baseUrl`, wildcard ambient types or `ignoreDeprecations`
compatibility escape hatch was added. The CSS regression test now checks TS2882,
TypeScript 6's diagnostic for unresolved side-effect imports.

The new React Hooks rules also removed redundant state synchronization effects:
the shared mobile sidebar derives its open status from the current path, and the
legacy showcase uses `useSyncExternalStore` for its remembered version, with the
URL taking precedence. Browser storage failure does not prevent navigation.

The shared UI's Radix Slot dependency is now 1.5.0. Browser validation exposed
the old 1.2.3 Slot dropping a lazy server-provided navbar child during hydration;
the compatible update fixes it without changing the layout. A dedicated
`apps/web` browser regression covers stored-version hydration, URL priority,
selection, browser history, returning home and unavailable browser storage.

On this Windows/pnpm 9 installation, Turbo 2.11.10 emits a misleading local
discovery warning: its shim misses the scoped native package hoisted by pnpm.
The wrapper resolves the actual local binary under
`node_modules/.pnpm/@turbo+windows-64@2.11.10/`; `turbo bin` confirms the path.
No global installation, warning-suppression flag or manual node_modules link is
used as a workaround. Recheck this when updating the workspace package manager.

## Final UI maintenance boundary

- Lucide React: 0.577.0 in the shared UI and showcase, kept on the 0.x line.
  Lucide 1 removes brand icons, including the GitHub mark used by RDX; that
  migration needs an explicit replacement rather than silently losing the icon.
- Motion: 12.43.0 in the showcase, without the separate migration to Motion 14.
- Tailwind Merge: 3.7.0; animation utilities: tw-animate-css 1.4.0. RDX does not
  use Tailwind prefixes, so its existing animation import remains appropriate.
- CVA, clsx and next-themes already match the current stable versions checked
  during this pass and remain unchanged.

Regression tests cover RDX's class-merging cases and the icons used by the
navbar, version menu, theme toggle and sidebar. The existing browser checks
exercise the resulting dropdown animations and mobile navigation.

Base UI has been selected as the direction for a separate component migration,
not installed in this maintenance PR. That change will adapt the shadcn source
components inside `packages/rdx-ui`, preserve the existing RDX theme/layout and
verify composition, focus, keyboard interaction and generated sites. The current
Radix-backed components stay in place until that migration is validated.

## Audit results and remaining work

The production audit (`pnpm audit --prod`) went from 67 advisories (4 critical,
35 high, 26 moderate, 2 low) to 5 after the Next.js 15 security update, then to
1 moderate advisory after the Next.js 16 migration (0 critical, 0 high).
Counts are a point-in-time dependency scan, not proof of exploitation or of
application-level reachability. The full audit, including development tools,
went from 33 advisories (0 critical, 21 high, 10 moderate, 2 low) to 2 after
updating development tools and compatible transitive packages: 1 high and
1 moderate. These are not additional to the production count: they include the
same production alert. This is not a full remediation.

The remaining high advisory is `braces` 3.0.3 via the Next.js ESLint plugin's
`fast-glob`/`micromatch` chain. The registry reports no patched version. It is a
development dependency, not part of the generated production runtime. Keep it
visible; do not replace its major version incompatibly or mute the advisory.

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
