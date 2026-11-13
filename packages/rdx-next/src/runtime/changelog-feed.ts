import { withBasePath } from '@lexibase/rdx-core'
import { changelogPluginName, readChangelog } from '@lexibase/rdx-core/config'
import type { RdxProject } from '@lexibase/rdx-types'

function xml(value: string) {
  return value
    .replace(
      // eslint-disable-next-line no-control-regex -- Match the characters XML 1.0 permits.
      /[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu,
      ''
    )
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function getChangelogFeedResponse(
  project: RdxProject,
  request: Request
) {
  const { config } = project
  if (!config.plugins.some(({ name }) => name === changelogPluginName))
    return new Response(null, { status: 404 })

  const origin = config.metadata.metadataBase ?? new URL(request.url).origin
  const changelog = new URL(withBasePath('/changelog', config.basePath), origin)
  const feed = new URL(
    withBasePath('/changelog/rss.xml', config.basePath),
    origin
  )
  const items = readChangelog(project.rootDir).map(
    ({ title, version, date }) => {
      const release = `${changelog.href}#v${encodeURIComponent(version)}`
      return `    <item>
      <title>${xml(`v${version} · ${title}`)}</title>
      <link>${xml(release)}</link>
      <guid isPermaLink="true">${xml(release)}</guid>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
    </item>`
    }
  )

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${config.metadata.applicationName} · Changelog`)}</title>
    <link>${xml(changelog.href)}</link>
    <description>${xml(config.description || `Release notes for ${config.metadata.applicationName}.`)}</description>
    <language>${xml(config.lang)}</language>
    <atom:link href="${xml(feed.href)}" rel="self" type="application/rss+xml" />
${items.join('\n')}
  </channel>
</rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } }
  )
}
