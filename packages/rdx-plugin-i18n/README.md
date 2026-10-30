# `@lexibase/rdx-i18n`

Assisted activation: `pnpm rdx add i18n` reuses `lang` and asks for additional
language tags. Use `--locales en,es-ES` noninteractively. The command prepares
`locale/<tag>/docs/`, preserves authored translations and existing plugin options,
and prepares the runtime. Later languages are added to `locales` and their
translation directories without reinstalling the plugin.

Optional multilingual content for RDX 4.1 and later. Activate it with the
assisted installer or configure it alongside compatible framework packages.

Set the optional `contributionUrl` next to `locales` to expose a community
translation link in the language menu and the missing-translation Callout:

```ts
i18n({
  locales: [
    { code: 'en', label: 'English' },
    { code: 'pt-BR', label: 'Português' },
  ],
  contributionUrl: 'https://github.com/organization/project/tree/main/locale',
})
```

Use an absolute HTTP(S) URL, including a monorepo path when needed. Links open
in a new tab and follow the interface language. Existing snapshots use the
current configured destination. Primary-language files stay in `docs/`;
`locale/` holds the additional languages.

```ts
import { i18n } from '@lexibase/rdx-i18n'

// Inside defineConfig:
plugins: [
  i18n({
    locales: [
      { code: 'en', label: 'English' },
      { code: 'pt-BR', label: 'Português (Brasil)', folder: 'ptbr' },
      { code: 'es-ES', label: 'Español' },
    ],
  }),
]
```

`lang` in the main configuration identifies the primary language. Keep its
content in `docs/`. Secondary content lives in `locale/<folder>/docs/`; folders
default to the lower-case language tag. Declare the primary language in the
list without a folder override. Secondary directories must exist, but pages can
be untranslated.

Matching relative MDX paths identify translations. A missing translation displays
the primary page with an explicit notice, at the requested language URL. There
is no machine translation or file copying. Missing primary and translated pages
return 404. Sidebar ordering follows the primary tree; translated labels overlay
it. Keep shared assets in root `public/`.

URLs use language tags, not folder aliases: `/en/docs/guides/intro` and
`/pt-br/docs/guides/intro`. Existing `/docs/...` URLs redirect to the primary
language. Search indexes contain authored content for the selected language.
Fallback pages are noindex and canonical to the original when metadataBase is
configured. The sitemap excludes untranslated fallback copies.

With the optional versioning plugin, one `rdx version <release>` captures every
language. Translated snapshots live in `locale/<folder>/versioned_docs/`; their
identity metadata is stored with the primary snapshot. Missing translations use
that edition's primary content, never the live tree. Archive, restore and
same-major redirects apply to the whole edition. Plugin declaration order does
not change this behavior. Keep the primary language stable after publishing.

Older snapshots without language metadata remain primary-language-only. Adding
or editing live translations does not change them. Commit all snapshot files,
including metadata, and retain historical identities for replaced URLs.

Installing the package alone does not activate it. Existing one-language
projects and their URLs remain unchanged without the configured plugin.
