import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  access,
  mkdir,
  mkdtemp,
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
      '---\ntitle: Introdução\n---\n\n## Olá\n\nTranslatedIntroMarker\n\n[Instalar](./install.mdx#requirements)'
    )
    await mkdir(path.join(root, 'locale/es-es/docs'), { recursive: true })
    await write(
      'public/logo.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
    )
    await write(
      'components/home.tsx',
      'export default function Home() { return <h1>CustomHomepageMarker</h1> }'
    )
    await write(
      'components/logo.tsx',
      'export default function Logo({ className }: { className?: string }) { return <svg className={className} aria-label="Custom logo" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg> }'
    )
    await write(
      'rdx.config.ts',
      `import { defineConfig } from '@lexibase/rdx'
import { i18n } from '@lexibase/rdx-i18n'
import Home from './components/home'
import Logo from './components/logo'
export default defineConfig({ metadata: { applicationName: 'Locale Docs', metadataBase: 'https://docs.example.test' }, lang: 'en', search: true, homepage: { enabled: true, component: Home }, navbar: { logo: Logo }, plugins: [i18n({ contributionUrl: 'https://github.com/example/project/tree/main/locale', locales: [{ code: 'en', label: 'English' }, { code: 'pt-BR', label: 'Português', folder: 'ptbr' }, { code: 'es-ES', label: 'Español' }] })] })`
    )
    const cli = path.resolve(packageRoot, '../rdx/bin/rdx.mjs')
    const built = spawnSync(process.execPath, [cli, 'build'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 480_000,
      maxBuffer: 5 * 1024 * 1024,
    })
    assert.equal(built.status, 0, built.stdout + built.stderr)
    assert.match(built.stdout, /3 pages checked, 0 problems/)
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
      assert.match(translated, /<html[^>]*lang="pt-BR"/)
      assert.match(translated, /TranslatedIntroMarker/)
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
      assert.match(await html('/'), /CustomHomepageMarker/)
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
    await writeFile(
      configFile,
      "import { versioning } from '@lexibase/rdx-versioning'\n" +
        config.replace('plugins: [', 'plugins: [versioning(), ')
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
      const html = async (url) => {
        const response = await fetch(base + url)
        assert.equal(response.status, 200, url)
        return response.text()
      }
      const archived = await html('/pt-br/docs/1.1.0/guides/intro')
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
        /https:\/\/docs.example.test\/en\/docs\/1.1.0\/guides\/install/
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
        /\/pt-br\/docs\/1.1.0\/guides\/intro\?ref=old$/
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
      assert.match(sitemap, /\/pt-br\/docs\/2.0.0\/guides\/intro/)
      assert.doesNotMatch(
        sitemap,
        /\/docs\/1.1.0\/|\/docs\/1.0.0\/|\/es-es\/docs/
      )
    }
    await withProductionServer(cli, root, verifyVersions, {
      readyPath: '/pt-br/docs/2.0.0/guides/intro',
    })
    await withProductionServer(
      require.resolve('next/dist/bin/next'),
      path.join(root, '.rdx'),
      verifyVersions,
      { readyPath: '/pt-br/docs/2.0.0/guides/intro' }
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
