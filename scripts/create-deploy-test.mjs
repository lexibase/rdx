import { execFileSync } from 'node:child_process'
import { cp, lstat, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const runtimePackages = [
  'rdx-types',
  'rdx-core',
  'rdx-ui',
  'rdx-next',
  'rdx-versioning',
]

function inside(parent, child) {
  const relative = path.relative(parent, child)
  return (
    !relative ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`))
  )
}

async function exists(filename) {
  try {
    return await lstat(filename)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export function parseDeployArguments(args) {
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const key = args[index]
    if (
      !['--from', '--out'].includes(key) ||
      options[key.slice(2)] ||
      !args[index + 1] ||
      args[index + 1].startsWith('--')
    )
      throw new Error(
        'Usage: pnpm test:deploy --from <release-folder> --out <new-project-folder>'
      )
    options[key.slice(2)] = args[++index]
  }
  if (!options.from || !options.out)
    throw new Error(
      'Both --from and --out are required. Use the release folder printed by test:release.'
    )
  return options
}

/** Export an existing, locally tested CLI project. Never install, publish or deploy. */
export async function createDeployTest({ from, out }) {
  const release = path.resolve(from)
  const source = path.join(release, 'project')
  const target = path.resolve(out)
  if (inside(source, target) || inside(target, source))
    throw new Error('The destination must not overlap the source project.')
  if (await exists(target))
    throw new Error(
      `Destination already exists: ${target}. Choose a new folder; nothing was overwritten.`
    )
  if ((await lstat(source)).isSymbolicLink())
    throw new Error('The source project must be a real directory, not a link.')
  const pkg = JSON.parse(
    await readFile(path.join(source, 'package.json'), 'utf8')
  )
  const archives = []
  for (const shortName of runtimePackages) {
    const name = `@lexibase/${shortName}`
    const reference = pkg.pnpm?.overrides?.[name]
    if (typeof reference !== 'string' || !reference.startsWith('file:'))
      throw new Error(
        `Missing local release archive for ${name}. Run test:release --install first.`
      )
    const archive = path.resolve(source, reference.slice(5))
    if (!inside(release, archive) || !(await lstat(archive)).isFile())
      throw new Error(`Invalid release archive: ${archive}`)
    const manifest = JSON.parse(
      execFileSync('tar', ['-xOf', archive, 'package/package.json'], {
        encoding: 'utf8',
      })
    )
    if (manifest.name !== name)
      throw new Error(`Archive identity mismatch for ${name}.`)
    archives.push({
      name,
      archive,
      file: path.basename(archive),
      dependencies: {
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
      },
    })
  }
  // Only source content belongs in the exported project: no installed modules,
  // build caches, lockfiles with absolute paths, credentials or Git history.
  const content = [
    'docs',
    'public',
    'versioned_docs',
    'versions.json',
    'rdx.config.ts',
    'home.tsx',
  ]
  for (const name of content) {
    const info = await exists(path.join(source, name))
    if (info?.isSymbolicLink())
      throw new Error(`Source links cannot be exported: ${name}`)
  }
  let config = await readFile(path.join(source, 'rdx.config.ts'), 'utf8')
  config = config
    .replace(/\bsearch:\s*false\b/, 'search: true')
    .replace(/\bTOC:\s*false\b/, 'TOC: true')
  const references = Object.fromEntries(
    archives.map(({ name, file }) => [name, `file:vendor/${file}`])
  )
  // Override transitive dependencies only. Overriding a root file dependency
  // makes pnpm record an absolute Windows specifier in an otherwise relative lock.
  const overrides = Object.fromEntries(
    archives.flatMap(({ name, dependencies }) =>
      Object.keys(dependencies)
        .filter((dependency) => references[dependency])
        .map((dependency) => [`${name}>${dependency}`, references[dependency]])
    )
  )
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
  ]) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      if (references[name]) pkg[section][name] = references[name]
      else if (/^(?:file:|link:|workspace:)/.test(pkg[section][name]))
        throw new Error(`Cannot export an unrelated local dependency: ${name}`)
    }
  }
  pkg.name = 'rdx-deploy-test'
  pkg.private = true
  pkg.packageManager = 'pnpm@9.0.0'
  pkg.engines = { ...pkg.engines, node: '24.x' }
  pkg.pnpm = { overrides }
  await mkdir(target)
  for (const name of content) {
    const filename = path.join(source, name)
    if (!(await exists(filename))) continue
    await cp(filename, path.join(target, name), {
      recursive: true,
      errorOnExist: true,
      force: false,
      filter: async (entry) => {
        if ((await lstat(entry)).isSymbolicLink())
          throw new Error(`Source links cannot be exported: ${entry}`)
        return true
      },
    })
  }
  await mkdir(path.join(target, 'vendor'))
  for (const { archive, file } of archives)
    await cp(archive, path.join(target, 'vendor', file), {
      errorOnExist: true,
      force: false,
    })
  await writeFile(
    path.join(target, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n'
  )
  await writeFile(path.join(target, 'rdx.config.ts'), config)
  await writeFile(
    path.join(target, 'pnpm-workspace.yaml'),
    // pnpm 9 reads package.json; pnpm 11 reads workspace settings.
    "packages:\n  - '.'\noverrides:\n" +
      Object.entries(overrides)
        .map(
          ([name, reference]) =>
            `  ${JSON.stringify(name)}: ${JSON.stringify(reference)}\n`
        )
        .join('')
  )
  await writeFile(
    path.join(target, '.gitignore'),
    'node_modules/\n.rdx/\n.next/\n.vercel/\n.env*\n*.log\n'
  )
  await writeFile(
    path.join(target, 'vercel.json'),
    JSON.stringify(
      {
        $schema: 'https://openapi.vercel.sh/vercel.json',
        framework: 'nextjs',
        installCommand: 'pnpm install --frozen-lockfile',
        buildCommand: 'pnpm build',
        outputDirectory: '.rdx/.next',
      },
      null,
      2
    ) + '\n'
  )
  await writeFile(
    path.join(target, 'README.md'),
    `# RDX deploy validation\n\nThis disposable project was created by the packed RDX CLI and exported for deployment testing.\n\nRun with Node 24 and pnpm 9:\n\n\`\`\`sh\npnpm install\npnpm build\npnpm start\n\`\`\`\n\nCommit source files, vendor/*.tgz, package.json, vercel.json, pnpm-workspace.yaml and the newly generated pnpm-lock.yaml. Never commit node_modules, .rdx or credentials. The archived RDX packages are intentional; no unpublished RDX package needs to be fetched from npm. Third-party dependencies still use the registry.\n\nFor the first Vercel validation, select Next.js, the repository root and Node 24. vercel.json supplies the install/build/output settings. No manual edits inside .rdx are needed. This configuration is a deployment candidate, not proof that a remote deployment passed. Check pages, images, search, TOC, version switching, CSS/JS and 404s on the resulting URL. Do not publish or connect accounts automatically.\n`
  )
  return target
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const target = await createDeployTest(
      parseDeployArguments(process.argv.slice(2))
    )
    console.log(
      `Portable deployment test created in ${target}\nNext: cd to that folder, then pnpm install and pnpm build.\nNothing was installed, committed, published or deployed.`
    )
  } catch (error) {
    console.error(`[RDX] ${error.message}`)
    process.exitCode = 1
  }
}
