import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const frameworkName = '@lexibase/rdx'
export const releaseOrder = [
  'rdx-types',
  'rdx-core',
  'rdx-ui',
  'rdx-plugin-versioning',
  'rdx-plugin-i18n',
  'rdx-plugin-changelog',
  'rdx-next',
  'rdx',
  'create-rdx',
]
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))
const writeJson = (file, value) =>
  writeFile(file, JSON.stringify(value, null, 2) + '\n')

export function assertCompatibleUi(range, version) {
  assert.match(range, /^\^\d+\.\d+\.\d+$/)
  const floor = range.slice(1).split('.').map(Number)
  const actual = version.split('.').map(Number)
  assert.equal(
    actual[0],
    floor[0],
    'Runtime and UI major versions are incompatible'
  )
  assert.ok(
    actual[1] > floor[1] || (actual[1] === floor[1] && actual[2] >= floor[2]),
    'UI is older than the runtime peer floor'
  )
}

export function promoteChangelog(source, version, summaries) {
  assert.ok(
    !source
      .split('\n')
      .some(
        (line) => line === `## ${version}` || line.startsWith(`## ${version} `)
      ),
    'Release changelog already exists'
  )
  const match = /^## Unreleased\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(
    source
  )
  assert.ok(match, 'CHANGELOG.md must contain an Unreleased section')
  const notes =
    match[1].trim() ||
    [...new Set(summaries)].map((text) => `- ${text}`).join('\n\n')
  assert.ok(notes, 'Write a release summary before preparation')
  return source.replace(
    match[0],
    `## Unreleased\n\n## ${version} — Prepared\n\n${notes}\n\n`
  )
}

export async function prepareRelease(
  root,
  { dryRun = false, commit = false, run = defaultRun, log = console.log } = {}
) {
  const noteDirectory = path.join(root, '.changeset')
  assert.equal(
    (await json(path.join(noteDirectory, 'config.json'))).commit,
    false,
    'Changesets automatic commits must remain disabled'
  )
  const notes = (await readdir(noteDirectory)).filter(
    (name) => name.endsWith('.md') && name !== 'README.md'
  )
  if (!notes.length) {
    log('No pending release notes. Run pnpm release:note first.')
    return null
  }
  const temp = await mkdtemp(path.join(os.tmpdir(), 'rdx-release-plan-'))
  try {
    const statusFile = path.join(temp, 'plan.json')
    await run('changeset', ['status', '--output', statusFile], root)
    const plan = await json(statusFile)
    const releases = plan.releases.filter((release) => release.type !== 'none')
    if (!releases.length) {
      log('No public package releases are pending.')
      return null
    }
    const framework = releases.find((release) => release.name === frameworkName)
    assert.ok(
      framework,
      'Include @lexibase/rdx in the release note to select the documentation edition.'
    )
    const version = framework.newVersion
    assert.match(
      version,
      /^\d+\.\d+\.\d+$/,
      'This command prepares stable releases only'
    )
    const packages = await Promise.all(
      releaseOrder.map(async (directory) => ({
        directory,
        manifest: await json(
          path.join(root, 'packages', directory, 'package.json')
        ),
      }))
    )
    const known = new Set(packages.map((pkg) => pkg.manifest.name))
    for (const release of releases)
      assert.ok(
        known.has(release.name),
        `Unknown release package: ${release.name}`
      )
    const creator = releases.find(
      (release) => release.name === '@lexibase/create-rdx'
    )
    assert.equal(
      creator?.newVersion,
      version,
      'Framework and creator must share their release version'
    )
    const versions = await json(path.join(root, 'apps/web/versions.json'))
    assert.ok(
      ![
        ...versions.active,
        ...versions.archived,
        ...Object.keys(versions.redirects || {}),
      ].includes(version),
      `Documentation ${version} already exists`
    )
    const next = version.split('.').map(Number)
    for (const previous of [...versions.active, ...versions.archived]) {
      if (!/^\d+\.\d+\.\d+$/.test(previous)) continue
      const old = previous.split('.').map(Number)
      if (old[0] === next[0])
        assert.ok(
          next[1] > old[1] || (next[1] === old[1] && next[2] > old[2]),
          'Documentation must advance within its major'
        )
    }
    const snapshot = path.join(
      root,
      'apps/web/versioned_docs',
      `version-${version}`
    )
    await assert.rejects(access(snapshot), { code: 'ENOENT' })
    const changelogPath = path.join(root, 'CHANGELOG.md')
    const changelog = promoteChangelog(
      await readFile(changelogPath, 'utf8'),
      version,
      plan.changesets.map((note) => note.summary)
    )
    const publishingPath = path.join(root, 'PUBLISHING.md')
    const publishing = await readFile(publishingPath, 'utf8')
    const heading = /^## Prepared grouped release: RDX ([\d.]+)/m
    assert.ok(
      heading.test(publishing),
      'PUBLISHING.md needs the current prepared release heading'
    )
    const apiPath = path.join(root, 'PUBLIC_API.md')
    const api = await readFile(apiPath, 'utf8')
    assert.ok(
      api.includes('<!-- rdx:packages:start -->') &&
        api.includes('<!-- rdx:packages:end -->'),
      'PUBLIC_API.md needs its generated package table markers'
    )
    const planned = packages.filter((pkg) =>
      releases.some((release) => release.name === pkg.manifest.name)
    )
    log(`RDX ${version}:`)
    for (const pkg of planned) {
      const release = releases.find((item) => item.name === pkg.manifest.name)
      log(
        `  ${release.name}: ${release.oldVersion} -> ${release.newVersion} (${release.type})`
      )
    }
    if (dryRun) {
      log('Preview only; package versions and documentation were not changed.')
      return plan
    }

    const trackedNotes = commit
      ? String(
          (await run(
            'git',
            [
              'ls-files',
              '-z',
              '--',
              ...notes.map((name) => `.changeset/${name}`),
            ],
            root
          )) || ''
        )
          .split('\0')
          .filter(Boolean)
      : []
    await run('changeset', ['version'], root)
    const updated = await Promise.all(
      packages.map(async (pkg) => ({
        ...pkg,
        manifest: await json(
          path.join(root, 'packages', pkg.directory, 'package.json')
        ),
      }))
    )
    for (const release of releases)
      assert.equal(
        updated.find((pkg) => pkg.manifest.name === release.name).manifest
          .version,
        release.newVersion
      )
    const templatePath = path.join(
      root,
      'packages/create-rdx/templates/default/package.json'
    )
    const template = await json(templatePath)
    template.dependencies[frameworkName] = version
    await writeJson(templatePath, template)
    await writeFile(changelogPath, changelog)
    const edition = version.split('.').slice(0, 2).join('.')
    const allPackages = updated
      .map((pkg) => `| ${pkg.manifest.name} | ${pkg.manifest.version} |`)
      .join('\n')
    await writeFile(
      apiPath,
      api
        .replace(/^# RDX public API — [\d.]+/m, `# RDX public API — ${edition}`)
        .replace(/public API of RDX [\d.]+/, `public API of RDX ${edition}`)
        .replace(
          /<!-- rdx:packages:start -->[\s\S]*?<!-- rdx:packages:end -->/,
          `<!-- rdx:packages:start -->\n\n| Package | Version |\n| --- | --- |\n${allPackages}\n\n<!-- rdx:packages:end -->`
        )
    )
    const table = planned
      .map(
        (pkg) =>
          `| ${pkg.manifest.name} | ${releases.find((item) => item.name === pkg.manifest.name).newVersion} |`
      )
      .join('\n')
    await writeJson(path.join(root, 'release-manifest.json'), {
      version,
      packages: Object.fromEntries(
        planned.map(({ manifest }) => [
          manifest.name,
          releases.find((item) => item.name === manifest.name).newVersion,
        ])
      ),
    })
    const commands = planned
      .map(
        (pkg) =>
          `pnpm --filter ${pkg.manifest.name} publish --tag latest --access public`
      )
      .join('\n')
    const current = publishing.replace(
      heading,
      '## Previous grouped release: RDX $1'
    )
    const checklist = `## Prepared grouped release: RDX ${version}\n\nGenerated by \`pnpm release:prepare\`. Only the packages listed here need publication.\n\n| Package | Version |\n| --- | --- |\n${table}\n\nAfter the tested release PR is merged, publish sequentially and confirm each exact\nversion in npm before its consumers:\n\n\`\`\`sh\n${commands}\n\`\`\`\n\nCheck exact versions with \`npm view <package>@<version> version\` and dist-tags\nwith \`npm view <package> dist-tags\`. Then verify a fresh registry installation.\nThe documentation snapshot ships in this same PR.\n\n`
    const insertion = current.indexOf('## Previous grouped release:')
    assert.ok(insertion >= 0)
    await writeFile(
      publishingPath,
      current.slice(0, insertion) + checklist + current.slice(insertion)
    )
    await run(
      'pnpm',
      ['install', '--lockfile-only', '--ignore-scripts', '--offline'],
      root
    )
    await run(
      'pnpm',
      [
        'exec',
        'turbo',
        'run',
        'build',
        '--filter=@lexibase/rdx-versioning...',
        '--filter=@lexibase/rdx-changelog...',
      ],
      root
    )
    await run('pnpm', ['--filter', 'web', 'docs:version', version], root)
    const files = [
      'CHANGELOG.md',
      'PUBLISHING.md',
      'PUBLIC_API.md',
      'release-manifest.json',
      'pnpm-lock.yaml',
      'apps/web/versions.json',
      `apps/web/versioned_docs/version-${version}`,
      'packages/create-rdx/templates/default/package.json',
      ...planned.map((pkg) => `packages/${pkg.directory}/package.json`),
    ]
    await run('pnpm', ['exec', 'prettier', '--write', ...files], root)
    if (commit) {
      const paths = [...files, ...trackedNotes]
      await run('git', ['add', '--all', '--', ...paths], root)
      // --only excludes unrelated files even if the operator staged them earlier.
      await run(
        'git',
        [
          'commit',
          '--only',
          '-m',
          `chore(release): prepare RDX ${version}`,
          '--',
          ...paths,
        ],
        root
      )
    }
    log(
      `Prepared RDX ${version}. ${commit ? 'Review the local commit and open one PR.' : 'Review the diff, commit and open one PR.'} GitHub Actions runs the complete validation.`
    )
    log(
      `${commit ? 'A local release commit was created.' : 'Nothing was committed.'} Nothing was tagged, pushed or published. Publication commands are in PUBLISHING.md.`
    )
    return plan
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()))
    await rm(temp, { recursive: true, force: true })
  }
}

function defaultRun(tool, args, root) {
  if (tool === 'git')
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  const entry =
    tool === 'changeset'
      ? require.resolve('@changesets/cli/bin.js')
      : process.env.npm_execpath
  assert.ok(
    entry,
    'Run this command through pnpm release:prepare or pnpm release:plan'
  )
  execFileSync(process.execPath, [entry, ...args], {
    cwd: root,
    stdio: 'inherit',
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2)
  if (args.includes('--help'))
    console.log(
      'Usage: pnpm release:prepare [--dry-run] [--commit]\n--commit creates a local commit after all preparation steps succeed.\nRecord changes with pnpm release:note; review with pnpm release:plan. Full validation runs in CI.'
    )
  else if (args.some((arg) => !['--dry-run', '--commit'].includes(arg))) {
    console.error('Unknown option. Use --help.')
    process.exitCode = 1
  } else
    try {
      await prepareRelease(fileURLToPath(new URL('../', import.meta.url)), {
        dryRun: args.includes('--dry-run'),
        commit: args.includes('--commit'),
      })
    } catch (error) {
      console.error(
        `[release] ${error.message}\nReview the working tree before retrying. No automatic rollback or publication was performed.`
      )
      process.exitCode = 1
    }
}
