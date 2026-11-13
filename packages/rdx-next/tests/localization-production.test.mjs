import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  access,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rmdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { withProductionServer } from '../../../scripts/production-server.mjs'

const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(path.join(packageRoot, 'package.json'))

test(
  'multilingual generated production: translated HTML, missing-page fallback, redirects, assets, search and metadata',
  { timeout: 600_000 },
  async (t) => {
    const root = await mkdtemp(path.join(packageRoot, '.runtime-test-locales-'))
    const links = []
    t.after(async () => {
      for (const link of links) await rm(link, { force: true })
      await rm(root, { recursive: true, force: true })
    })
    async function link(name, target) {
      const destination = path.join(root, 'node_modules', name)
      await mkdir(path.dirname(destination), { recursive: true })
      await symlink(
        target,
        destination,
        process.platform === 'win32' ? 'junction' : 'dir'
      )
      links.push(destination)
    }
    for (const name of [
      'next',
      'react',
      'react-dom',
      'typescript',
      '@types/node',
      '@types/react',
      '@types/react-dom',
    ])
      await link(name, path.dirname(require.resolve(`${name}/package.json`)))
    for (const [name, directory] of [
      ['rdx', 'rdx'],
      ['rdx-next', 'rdx-next'],
      ['rdx-core', 'rdx-core'],
      ['rdx-types', 'rdx-types'],
      ['rdx-ui', 'rdx-ui'],
      ['rdx-i18n', 'rdx-plugin-i18n'],
      ['rdx-changelog', 'rdx-plugin-changelog'],
      ['rdx-versioning', 'rdx-plugin-versioning'],
    ])
      await link(
        `@lexibase/${name}`,
        path.resolve(packageRoot, '..', directory)
      )
    async function write(file, content) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true })
      await writeFile(path.join(root, file), content)
    }
    await write(
      'package.json',
      JSON.stringify({
        name: 'rdx-localization-fixture',
        private: true,
        type: 'module',
        dependencies: { '@lexibase/rdx-changelog': '*' },
      })
    )
    await write(
      'docs/guides/intro.mdx',
      '---\ntitle: Introduction\nlink_position: 1\n---\n\n## Hello\n\nOriginalIntroMarker\n\n[Install](./install.mdx#requirements)\n\n![Logo](/logo.svg)'
    )
    await write(
      'docs/guides/install.mdx',
      '---\ntitle: Installation\nlink_position: 2\n---\n\n## Requirements\n\nOriginalInstallMarker\n\n[Hello](./intro.mdx#hello)'
    )
    await write(
      'locale/ptbr/docs/guides/intro.mdx',
      '---\ntitle: Introdução\n---\n\n## Olá\n\nTranslatedIntroMarker\n\n[Instalar](./install.mdx#requirements)\n\n![Logo](/logo.svg)'
    )
    await mkdir(path.join(root, 'locale/es-es/docs'), { recursive: true })
    await mkdir(path.join(root, 'locale/fr-fr/docs'), { recursive: true })
    await write(
      'public/logo.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
    )
    const brandPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      'base64'
    )
    await write('public/brand.png', brandPng)
    await write(
      'components/home.tsx',
      `import type { RdxTranslatedHomepageProps } from '@lexibase/rdx'
export default function Home({ lang, docsHref, t }: RdxTranslatedHomepageProps) {
  return <><h1 data-home-lang={lang}>{t('CustomHomepageMarker')}</h1><p>{t('PrimaryOnlyMarker')}</p><a data-home-docs href={docsHref}>{t('Docs')}</a></>
}`
    )
    await write(
      'locale/ptbr/home.json',
      '{"CustomHomepageMarker":"TranslatedHomepageMarker","Docs":"Documentação","$metadata":{"title":"Início do projeto"}}'
    )
    await write(
      'locale/es-es/home.json',
      '{"CustomHomepageMarker":"SpanishHomepageMarker","PrimaryOnlyMarker":"  ","Obsolete phrase":"UnusedHomepageCatalogMarker","$metadata":{"title":"Inicio del proyecto","description":"Documentación del proyecto"}}'
    )
    await write(
      'locale/fr-fr/home.json',
      '{"$metadata":{"title":"Accueil sans traduction"},"Old phrase":"Texte obsolète"}'
    )
    await write(
      'locale/ptbr/home.tsx',
      'export default function Home() { return <h1>LocaleOverrideMarker</h1> }'
    )
    await write(
      'components/logo.tsx',
      'export default function Logo({ className }: { className?: string }) { return <svg className={className} aria-label="Custom logo" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg> }'
    )
    await write(
      'rdx.config.ts',
      `import { defineConfig } from '@lexibase/rdx'
import { i18n } from '@lexibase/rdx-i18n'
import Logo from './components/logo'
export default defineConfig({ metadata: { applicationName: 'Locale Docs', metadataBase: 'https://docs.example.test', openGraph: { images: [{ url: '/brand.png' }] } }, lang: 'en', search: true, homepage: { enabled: true, translations: true }, navbar: { logo: Logo }, plugins: [i18n({ contributionUrl: 'https://github.com/example/project/tree/main/locale', locales: [{ code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português', folder: 'ptbr' }, { code: 'es-ES', label: 'Español' }, { code: 'fr-FR', label: 'Français' }] })] })`
    )
    const cli = path.resolve(packageRoot, '../rdx/bin/rdx.mjs')
    const checked = spawnSync(process.execPath, [cli, 'check'], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(checked.status, 0, checked.stdout + checked.stderr)
    for (const phrase of ['PrimaryOnlyMarker', 'Docs'])
      assert.match(
        checked.stderr,
        new RegExp(`missing translation for "${phrase}"`)
      )
    assert.match(checked.stderr, /orphaned translation for "Obsolete phrase"/)
    assert.match(
      checked.stderr,
      /locale\/ptbr\/home\.json: missing translation for "PrimaryOnlyMarker"/
    )
    assert.doesNotMatch(checked.stderr, /orphaned translation for "\$metadata"/)
    const built = spawnSync(process.execPath, [cli, 'build'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 480_000,
      maxBuffer: 5 * 1024 * 1024,
    })
    assert.equal(built.status, 0, built.stdout + built.stderr)
    assert.match(built.stdout, /3 pages checked, 0 problems/)
    assert.match(built.stderr, /orphaned translation for "Obsolete phrase"/)
    const clientOutput = path.join(root, '.rdx/.next/static')
    for (const filename of await readdir(clientOutput, { recursive: true })) {
      if (!filename.endsWith('.js')) continue
      assert.doesNotMatch(
        await readFile(path.join(clientOutput, filename), 'utf8'),
        /SpanishHomepageMarker|UnusedHomepageCatalogMarker/
      )
    }
    assert.doesNotMatch(
      built.stdout + built.stderr,
      /Dynamic filesystem access causes tracing of the whole project/
    )
    // Empty source directories are not included in serverless file traces.
    await rmdir(path.join(root, 'locale/es-es/docs'))
    const verify = async (base) => {
      const html = async (url) => {
        const response = await fetch(base + url)
        assert.equal(response.status, 200, url)
        return response.text()
      }
      const translated = await html('/pt-br/docs/guides/intro')
      assert.doesNotMatch(translated, /href="\/changelog"/)
      assert.equal((await fetch(base + '/changelog')).status, 404)
      assert.match(await html('/en/docs'), /OriginalIntroMarker/)
      assert.match(await html('/pt-br/docs'), /TranslatedIntroMarker/)
      assert.match(translated, /<html[^>]*lang="pt-BR"/)
      assert.match(translated, /TranslatedIntroMarker/)
      assert.match(translated, /aria-label="Custom logo"/)
      assert.match(
        translated,
        /<a[^>]*aria-label="Locale Docs"[^>]*href="\/pt-br"/
      )
      assert.match(translated, /data-rdx-language-trigger/)
      assert.match(
        translated,
        /href="\/pt-br\/docs\/guides\/install#requirements"/
      )
      assert.doesNotMatch(translated, /data-rdx-translation-fallback/)
      assert.doesNotMatch(translated, /data-rdx-translate-page/)
      assert.doesNotMatch(translated, /data-rdx-version-trigger/)
      const fallback = await html('/pt-br/docs/guides/install')
      assert.match(fallback, /<html[^>]*lang="pt-BR"/)
      assert.match(fallback, /<main[^>]*lang="en"/)
      assert.match(fallback, /OriginalInstallMarker/)
      assert.match(fallback, /data-rdx-translation-fallback/)
      assert.match(fallback, /data-rdx-translate-page/)
      assert.match(fallback, /Traduza esta página/)
      assert.match(
        fallback,
        /href="https:\/\/github.com\/example\/project\/tree\/main\/locale"/
      )
      assert.match(fallback, /href="\/en\/docs\/guides\/intro#hello"/)
      assert.match(fallback, /name="robots" content="noindex, follow"/)
      assert.match(
        fallback,
        /rel="canonical" href="https:\/\/docs.example.test\/en\/docs\/guides\/install"/
      )
      const spanish = await html('/es-es/docs/guides/intro')
      assert.match(spanish, /<html[^>]*lang="es-ES"/)
      assert.match(spanish, /data-rdx-translation-fallback/)
      assert.equal((await fetch(base + '/pt-br/docs/no-page')).status, 404)
      assert.equal(
        (await fetch(base + '/unknown/docs/guides/intro')).status,
        404
      )
      const redirect = await fetch(base + '/docs/guides/intro?ref=legacy', {
        redirect: 'manual',
      })
      assert.equal(redirect.status, 308)
      assert.match(
        redirect.headers.get('location'),
        /\/en\/docs\/guides\/intro\?ref=legacy$/
      )
      const search = await html('/pt-br/rdx-search/_')
      assert.match(search, /TranslatedIntroMarker/)
      assert.doesNotMatch(search, /OriginalInstallMarker|OriginalIntroMarker/)
      const sitemap = await html('/sitemap.xml')
      assert.match(sitemap, /\/pt-br\/docs\/guides\/intro/)
      assert.doesNotMatch(
        sitemap,
        /\/pt-br\/docs\/guides\/install|\/es-es\/docs/
      )
      const home = await html('/')
      assert.match(home, /CustomHomepageMarker/)
      assert.match(
        home,
        /rel="canonical" href="https:\/\/docs.example.test\/?"/
      )
      assert.match(
        home,
        /hreflang="pt-BR" href="https:\/\/docs.example.test\/pt-br"/i
      )
      assert.match(
        home,
        /hreflang="es-ES" href="https:\/\/docs.example.test\/es-es"/i
      )
      assert.doesNotMatch(home, /hreflang="fr-FR"/i)
      assert.match(home, /<a data-home-docs="true" href="\/en\/docs"/)
      const localizedHome = await html('/pt-br')
      assert.match(localizedHome, /<html[^>]*lang="pt-BR"/)
      assert.match(localizedHome, /TranslatedHomepageMarker/)
      assert.match(localizedHome, /<title>Início do projeto<\/title>/)
      assert.match(localizedHome, /data-home-lang="pt-BR"/)
      assert.doesNotMatch(
        localizedHome,
        /CustomHomepageMarker|LocaleOverrideMarker/
      )
      assert.match(
        localizedHome,
        /<a data-home-docs="true" href="\/pt-br\/docs"/
      )
      assert.match(localizedHome, /data-rdx-language-trigger/)
      const fallbackHome = await html('/es-es')
      assert.match(fallbackHome, /<html[^>]*lang="es-ES"/)
      assert.match(fallbackHome, /SpanishHomepageMarker/)
      assert.match(fallbackHome, /<title>Inicio del proyecto<\/title>/)
      assert.match(
        fallbackHome,
        /name="description" content="Documentación del proyecto"/
      )
      assert.match(
        fallbackHome,
        /property="og:title" content="Inicio del proyecto"/
      )
      assert.match(
        fallbackHome,
        /property="og:description" content="Documentación del proyecto"/
      )
      assert.match(
        fallbackHome,
        /property="og:image" content="https:\/\/docs.example.test\/brand.png"/
      )
      assert.match(
        fallbackHome,
        /name="twitter:title" content="Inicio del proyecto"/
      )
      assert.match(
        fallbackHome,
        /hreflang="en" href="https:\/\/docs.example.test\/?"/i
      )
      assert.match(
        fallbackHome,
        /rel="canonical" href="https:\/\/docs.example.test\/es-es"/
      )
      assert.match(fallbackHome, /PrimaryOnlyMarker/)
      assert.match(
        fallbackHome,
        /<a data-home-docs="true" href="\/es-es\/docs"/
      )
      const primaryHome = await fetch(base + '/en', { redirect: 'manual' })
      assert.equal(primaryHome.status, 308)
      assert.equal(primaryHome.headers.get('location'), '/')
      const frenchHome = await html('/fr-fr')
      assert.match(frenchHome, /CustomHomepageMarker/)
      assert.match(frenchHome, /name="robots" content="noindex, follow"/)
      assert.match(
        frenchHome,
        /rel="canonical" href="https:\/\/docs.example.test\/?"/
      )
      assert.doesNotMatch(
        frenchHome,
        /<title>Accueil sans traduction<\/title>|hreflang=/i
      )
      assert.match(await html('/logo.svg'), /<svg/)
    }
    await withProductionServer(cli, root, verify, {
      readyPath: '/en/docs/guides/intro',
    })
    await withProductionServer(
      require.resolve('next/dist/bin/next'),
      path.join(root, '.rdx'),
      verify,
      {
        readyPath: '/en/docs/guides/intro',
      }
    )
    // Deployment traces must retain translations, not just the primary tree.
    const trace = await readFile(
      path.join(
        root,
        '.rdx/.next/server/app/(rdx-locales)/[locale]/docs/[[...slug]]/page.js.nft.json'
      ),
      'utf8'
    )
    assert.ok(
      JSON.parse(trace).files.some((file) =>
        file.replaceAll('\\', '/').endsWith('locale/ptbr/docs/guides/intro.mdx')
      )
    )
    await access(path.join(root, 'locale/ptbr/docs/guides/intro.mdx'))

    // Enable the independent versioning plugin on the same generated project.
    await mkdir(path.join(root, 'locale/es-es/docs'), { recursive: true })
    const configFile = path.join(root, 'rdx.config.ts')
    const config = await readFile(configFile, 'utf8')
    await write(
      'changelog/new.mdx',
      "---\nversion: '2.0.0'\ndate: '2026-01-01'\ntitle: New release\nbadge: breaking, security, deprecated\n---\n\n> [!NOTE]\n> LatestReleaseMarker\n\n![Logo](/logo.svg)" +
        '\n\nDetails about the latest release.'.repeat(30)
    )
    await writeFile(
      configFile,
      "import { versioning } from '@lexibase/rdx-versioning'\n" +
        config
          .replace("lang: 'en'", "basePath: '/minha-tool', lang: 'en'")
          .replace(
            "applicationName: 'Locale Docs'",
            "applicationName: 'Locale Docs', icons: { icon: '/logo.svg' }, twitter: { images: ['/brand.png'] }"
          )
          .replace('plugins: [', 'plugins: [versioning(), ')
          .replace("import Logo from './components/logo'", '')
          .replace('navbar: { logo: Logo }', "navbar: { logo: '/brand.png' }")
          .replace(
            'homepage: { enabled: true, translations: true }',
            'homepage: { enabled: true }'
          )
    )
    const command = (...args) => {
      const result = spawnSync(process.execPath, [cli, ...args], {
        cwd: root,
        encoding: 'utf8',
        timeout: 480_000,
        maxBuffer: 5 * 1024 * 1024,
      })
      assert.equal(result.status, 0, result.stdout + result.stderr)
      assert.doesNotMatch(
        result.stdout + result.stderr,
        /Dynamic filesystem access causes tracing of the whole project/
      )
      return result.stdout
    }
    assert.match(command('add', 'changelog'), /Changelog activated/)
    assert.match(command('add', 'changelog'), /Changelog is already configured/)
    assert.match(
      command('changelog', 'new', '1.0.0'),
      /Created changelog\/1\.0\.0\.md/
    )
    const draft = await readFile(path.join(root, 'changelog/1.0.0.md'), 'utf8')
    assert.match(draft, /version: '1\.0\.0'/)
    await write(
      'changelog/1.0.0.md',
      draft.replace(/date: '[^']+'/, "date: '2025-01-01'") +
        'FirstReleaseMarker\n'
    )
    command('version', '1.0.0')
    const frozenMetadata = await readFile(
      path.join(root, 'versioned_docs/version-1.0.0/.rdx-locales.json'),
      'utf8'
    )
    const portuguese = await readFile(
      path.join(root, 'locale/ptbr/docs/guides/intro.mdx'),
      'utf8'
    )
    await write(
      'locale/ptbr/docs/guides/intro.mdx',
      portuguese.replace('TranslatedIntroMarker', 'UpdatedPortugueseMarker')
    )
    const english = await readFile(
      path.join(root, 'docs/guides/intro.mdx'),
      'utf8'
    )
    await write(
      'docs/guides/intro.mdx',
      english.replace('OriginalIntroMarker', 'UpdatedOriginalMarker')
    )
    command('version', '1.1.0')
    command('version', '2.0.0')
    command('archive', '1.1.0')
    await write(
      'locale/ptbr/docs/guides/intro.mdx',
      portuguese.replace('TranslatedIntroMarker', 'UnreleasedPortugueseMarker')
    )
    await write(
      'locale/ptbr/docs/guides/install.mdx',
      '---\ntitle: Instalação\n---\n\n## Requirements\n\nPortugueseInstallLiveMarker'
    )
    for (const version of ['1.0.0', '1.1.0', '2.0.0'])
      await rmdir(
        path.join(root, `locale/es-es/versioned_docs/version-${version}`)
      )
    assert.match(command('build'), /10 pages checked, 0 problems/)
    await rmdir(path.join(root, 'locale/es-es/docs'))
    assert.equal(
      await readFile(
        path.join(root, 'versioned_docs/version-1.0.0/.rdx-locales.json'),
        'utf8'
      ),
      frozenMetadata
    )
    assert.match(
      await readFile(
        path.join(
          root,
          'locale/ptbr/versioned_docs/version-1.0.0/guides/intro.mdx'
        ),
        'utf8'
      ),
      /TranslatedIntroMarker/
    )

    const verifyVersions = async (base) => {
      base += '/minha-tool'
      const html = async (url) => {
        const response = await fetch(base + url)
        assert.equal(response.status, 200, url)
        return response.text()
      }
      const home = await html('/')
      assert.match(home, /data-rdx-home/)
      assert.match(home, /href="\/minha-tool\/changelog"[^>]*>Changelog</)
      const changes = await html('/changelog')
      assert.match(changes, /id="v2\.0\.0"[\s\S]*id="v1\.0\.0"/)
      assert.match(changes, /href="#v2\.0\.0"/)
      assert.match(changes, /href="#v2\.0\.0" aria-current="location"/)
      assert.match(changes, /aria-label="Copy link to release v1\.0\.0"/)
      assert.match(changes, /datetime="2026-01-01"/i)
      const [latestRelease, firstRelease] = changes.match(
        /<article\b[^>]*>[\s\S]*?<\/article>/g
      )
      assert.match(
        latestRelease,
        /data-slot="badge"[^>]*>Breaking changes<.*data-slot="badge"[^>]*>Security<.*data-slot="badge"[^>]*>Deprecated</s
      )
      assert.doesNotMatch(firstRelease, /<span[^>]*data-slot="badge"/)
      assert.match(changes, /LatestReleaseMarker/)
      assert.match(changes, /data-rdx-callout="note"/)
      assert.match(changes, /FirstReleaseMarker/)
      assert.match(changes, /src="\/minha-tool\/logo.svg"/)
      assert.equal(
        (home.match(/src="\/minha-tool\/brand\.png"/g) ?? []).length,
        2
      )
      assert.match(home, /href="\/minha-tool\/logo.svg"/)
      const missingPage = await fetch(base + '/pt-br/docs/no-page', {
        headers: { accept: 'text/html' },
      })
      assert.equal(missingPage.status, 404)
      // Next may stream the not-found boundary as Flight data before hydration.
      const missingHtml = await missingPage.text()
      const flight = [
        ...missingHtml.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs),
      ]
        .map((match) => JSON.parse(match[1]))
        .filter((chunk) => chunk[0] === 1)
        .map((chunk) => chunk[1])
        .join('')
      assert.match(flight, /LocalizedNotFound/)
      assert.match(flight, /"href":"\/minha-tool\/pt-br\/docs"/)
      assert.match(
        flight,
        /"logo":\["\$","img",null,\{"src":"\/minha-tool\/brand\.png"/
      )
      const image = await fetch(base + '/brand.png')
      assert.equal(image.status, 200)
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), brandPng)
      const archived = await html('/pt-br/docs/1.1.0/guides/intro')
      assert.match(
        archived,
        /<nav[\s\S]*?<img[^>]*src="\/minha-tool\/brand\.png"/
      )
      assert.match(archived, /src="\/minha-tool\/logo\.svg"/)
      assert.match(archived, /<html[^>]*lang="pt-BR"/)
      assert.match(archived, /UpdatedPortugueseMarker/)
      assert.doesNotMatch(archived, /UnreleasedPortugueseMarker/)
      assert.match(archived, /data-rdx-version-trigger/)
      assert.match(archived, /data-rdx-language-trigger/)
      const missing = await html('/pt-br/docs/1.1.0/guides/install')
      assert.match(missing, /OriginalInstallMarker/)
      assert.match(missing, /data-rdx-translation-fallback/)
      assert.match(missing, /data-rdx-translate-page/)
      assert.doesNotMatch(missing, /PortugueseInstallLiveMarker/)
      assert.match(
        missing,
        /https:\/\/docs.example.test\/minha-tool\/en\/docs\/1.1.0\/guides\/install/
      )
      const live = await html('/pt-br/docs/guides/install')
      assert.match(live, /PortugueseInstallLiveMarker/)
      assert.doesNotMatch(live, /data-rdx-translation-fallback/)
      const previous = await fetch(
        base + '/pt-br/docs/1.0.0/guides/intro?ref=old',
        { redirect: 'manual' }
      )
      assert.equal(previous.status, 308)
      assert.match(
        previous.headers.get('location'),
        /^\/minha-tool\/pt-br\/docs\/1.1.0\/guides\/intro\?ref=old$/
      )
      const search = await html('/pt-br/rdx-search/1.1.0')
      assert.match(search, /UpdatedPortugueseMarker/)
      assert.doesNotMatch(
        search,
        /UnreleasedPortugueseMarker|PortugueseInstallLiveMarker|UpdatedOriginalMarker/
      )
      assert.match(
        await html('/es-es/docs/2.0.0/guides/intro'),
        /data-rdx-translation-fallback/
      )
      const sitemap = await html('/sitemap.xml')
      assert.match(sitemap, /\/minha-tool\/pt-br\/docs\/2.0.0\/guides\/intro/)
      assert.doesNotMatch(
        sitemap,
        /\/docs\/1.1.0\/|\/docs\/1.0.0\/|\/es-es\/docs/
      )
      const translated = await html('/pt-br/docs/2.0.0/guides/intro')
      assert.match(
        translated,
        /rel="canonical" href="https:\/\/docs.example.test\/minha-tool\/pt-br\/docs\/2.0.0\/guides\/intro"/
      )
      assert.match(
        translated,
        /hreflang="en" href="https:\/\/docs.example.test\/minha-tool\/en\/docs\/2.0.0\/guides\/intro"/i
      )
      assert.match(
        translated,
        /property="og:url" content="https:\/\/docs.example.test\/minha-tool\/pt-br\/docs\/2.0.0\/guides\/intro"/
      )
      assert.match(
        translated,
        /property="og:image" content="https:\/\/docs.example.test\/minha-tool\/brand.png"/
      )
      assert.match(
        translated,
        /name="twitter:image" content="https:\/\/docs.example.test\/minha-tool\/brand.png"/
      )
      assert.match(
        translated,
        /href="\/minha-tool\/pt-br\/docs\/2.0.0\/guides\/install#requirements"/
      )
      assert.match(translated, /\/minha-tool\/pt-br\/rdx-search\/2\.0\.0/)
      assert.match(
        translated,
        /\/minha-tool\/rdx-markdown\/pt-br\/docs\/2\.0\.0\/guides\/intro\.md/
      )
      assert.doesNotMatch(
        translated,
        /(?:src|href)="\/(?!\/|minha-tool(?:[/#?]|"))/
      )
      const origin = new URL(base).origin
      for (const [, asset] of translated.matchAll(
        /(?:src|href)="(\/minha-tool\/(?:_next\/static\/[^" ]+|logo\.svg|brand\.png))"/g
      )) {
        assert.equal((await fetch(origin + asset)).status, 200, asset)
      }
      const markdown = await html(
        '/rdx-markdown/pt-br/docs/2.0.0/guides/intro.md'
      )
      assert.match(
        markdown,
        /https:\/\/docs.example.test\/minha-tool\/pt-br\/docs\/llms.txt/
      )
      assert.match(
        markdown.replaceAll('\\:', ':'),
        /https:\/\/docs.example.test\/minha-tool\/logo.svg/
      )
      assert.match(
        await html('/pt-br/docs/llms.txt'),
        /\/minha-tool\/rdx-markdown\/pt-br\/docs\/2.0.0\/guides\/intro\.md/
      )
      assert.match(
        await html('/robots.txt'),
        /Sitemap: https:\/\/docs.example.test\/minha-tool\/sitemap.xml/
      )
      assert.equal(
        (
          await fetch(origin + '/pt-br/docs/2.0.0/guides/intro', {
            redirect: 'manual',
          })
        ).status,
        404
      )
    }
    await withProductionServer(
      cli,
      root,
      async (upstream) => {
        await verifyVersions(upstream)
        await write(
          'router/app/layout.jsx',
          'export default function Layout({ children }) { return <html><body>{children}</body></html> }'
        )
        await write(
          'router/app/page.jsx',
          'export default function RouterHome() { return <main>RouterHomepageMarker</main> }'
        )
        await write(
          'router/next.config.mjs',
          `export default {
  agentRules: false,
  turbopack: { root: ${JSON.stringify(path.resolve(packageRoot, '../..'))} },
  async rewrites() {
    return [{ source: '/minha-tool/:path*', destination: '${upstream}/minha-tool/:path*' }]
  }
}`
        )
        await withProductionServer(
          require.resolve('next/dist/bin/next'),
          path.join(root, 'router'),
          async (router) => {
            assert.match(
              await (await fetch(router)).text(),
              /RouterHomepageMarker/
            )
            await verifyVersions(router)
            if (!process.env.RDX_PLAYWRIGHT_MODULE) return

            const { chromium } = require(process.env.RDX_PLAYWRIGHT_MODULE)
            const browser = await chromium.launch({
              executablePath: process.env.RDX_BROWSER_EXECUTABLE,
            })
            try {
              const page = await browser.newPage({
                permissions: ['clipboard-read', 'clipboard-write'],
              })
              const unexpected = []
              page.on('request', (request) => {
                const { origin, pathname } = new URL(request.url())
                if (
                  origin === router &&
                  pathname !== '/minha-tool' &&
                  !pathname.startsWith('/minha-tool/')
                )
                  unexpected.push(pathname)
              })
              const doc = '/minha-tool/en/docs/2.0.0/guides/intro'
              const home = '/minha-tool'
              const localizedHome = `${home}/pt-br`
              await page.goto(router + home)
              const logo = page.getByRole('link', { name: 'Locale Docs' })
              const languages = page.locator('[data-rdx-language-trigger]')
              const english = page.locator('a[hreflang="en"]')
              const portuguese = page.locator('a[hreflang="pt-BR"]')
              for (const [current, target, option] of [
                [home, localizedHome, portuguese],
                [localizedHome, home, english],
              ]) {
                assert.equal(await logo.getAttribute('href'), current)
                await languages.click()
                assert.equal(await english.getAttribute('href'), home)
                assert.equal(
                  await portuguese.getAttribute('href'),
                  localizedHome
                )
                await option.click()
                await page.waitForURL(router + target)
              }
              await page.goto(router + doc)
              const markdown = page.waitForResponse((response) =>
                new URL(response.url()).pathname.startsWith(
                  '/minha-tool/rdx-markdown/'
                )
              )
              await page.getByRole('button', { name: 'Copy this page' }).click()
              assert.equal((await markdown).status(), 200)

              const search = page.waitForResponse((response) =>
                new URL(response.url()).pathname.startsWith(
                  '/minha-tool/en/rdx-search/'
                )
              )
              await page.keyboard.press('Control+k')
              assert.equal((await search).status(), 200)
              await page.getByRole('combobox').fill('Installation')
              await page
                .getByRole('option', { name: /Installation/ })
                .first()
                .click()
              await page.waitForURL(
                '**/minha-tool/en/docs/2.0.0/guides/install'
              )
              await page.goto(router + doc)

              await page.locator('[data-rdx-language-trigger]').click()
              await page.locator('a[hreflang="pt-BR"]').click()
              await page.waitForURL(
                '**/minha-tool/pt-br/docs/2.0.0/guides/intro'
              )
              await page.locator('[data-rdx-version-trigger]').click()
              await page.getByRole('menuitem', { name: /1\.1\.0/ }).click()
              await page.waitForURL(
                '**/minha-tool/pt-br/docs/1.1.0/guides/intro'
              )

              const changelog = `${router}/minha-tool/changelog`
              await page.goto(changelog)
              const latestNote = page.locator('[id="v2.0.0"]')
              const dateBox = await latestNote.locator('time').boundingBox()
              const badgeBox = await latestNote
                .getByText('Breaking changes', { exact: true })
                .boundingBox()
              assert.ok(
                dateBox && badgeBox && badgeBox.x > dateBox.x + dateBox.width
              )
              assert.ok(Math.abs(dateBox.y - badgeBox.y) <= 2)
              const versions = page.getByRole('navigation', {
                name: 'Versions',
              })
              const activeVersion = versions.locator(
                '[aria-current="location"]'
              )
              await activeVersion.filter({ hasText: 'v2.0.0' }).waitFor()
              await page.locator('#rdx-main').evaluate((main) => {
                main.scrollTop = main.scrollHeight
              })
              await activeVersion.filter({ hasText: 'v1.0.0' }).waitFor()
              await page
                .getByRole('button', { name: 'Copy link to release v1.0.0' })
                .click()
              await page
                .getByText('Release link copied.', { exact: true })
                .waitFor()
              assert.equal(
                await page.evaluate(() => navigator.clipboard.readText()),
                `${changelog}#v1.0.0`
              )
              await versions.getByRole('link', { name: 'v2.0.0' }).click()
              await page.waitForURL(`${changelog}#v2.0.0`)
              await activeVersion.filter({ hasText: 'v2.0.0' }).waitFor()
              assert.deepEqual(unexpected, [])
            } finally {
              await browser.close()
            }
          },
          { mode: 'dev', readyPath: '/' }
        )
      },
      {
        readyPath: '/minha-tool/pt-br/docs/2.0.0/guides/intro',
      }
    )
    await withProductionServer(
      require.resolve('next/dist/bin/next'),
      path.join(root, '.rdx'),
      verifyVersions,
      { readyPath: '/minha-tool/pt-br/docs/2.0.0/guides/intro' }
    )
    const frozenTrace = JSON.parse(
      await readFile(
        path.join(
          root,
          '.rdx/.next/server/app/(rdx-locales)/[locale]/docs/[[...slug]]/page.js.nft.json'
        ),
        'utf8'
      )
    ).files.map((file) => file.replaceAll('\\', '/'))
    assert.ok(frozenTrace.some((file) => file.endsWith('changelog/new.mdx')))
    assert.ok(
      frozenTrace.some((file) =>
        file.endsWith(
          'locale/ptbr/versioned_docs/version-1.1.0/guides/intro.mdx'
        )
      )
    )
    assert.ok(
      frozenTrace.some((file) =>
        file.endsWith('versioned_docs/version-1.0.0/.rdx-locales.json')
      )
    )
    assert.equal(
      frozenTrace.some((file) =>
        file.endsWith(
          'locale/ptbr/versioned_docs/version-1.0.0/guides/intro.mdx'
        )
      ),
      false
    )
  }
)
