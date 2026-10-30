# `@lexibase/rdx-i18n`

Optional multilingual content for RDX. This private workspace package is in its
first implementation stage; do not publish it independently of compatible
framework packages.

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

The first stage supports unversioned projects. Combining localization with a
snapshot/versioning plugin is rejected before a snapshot command can run.
Multilingual snapshot contributions require the next implementation stage;
the contracts and acceptance cases are in `MULTILINGUAL_DESIGN.md`.

Installing the package alone does not activate it. Existing one-language
projects and their URLs remain unchanged without the configured plugin.
