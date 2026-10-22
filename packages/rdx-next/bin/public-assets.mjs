import { lstat, mkdir, realpath, symlink, unlink } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

async function inspect(filePath) {
  try {
    return await lstat(filePath)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

/** Link generated Next public/ to project-owned assets; never copy or delete them. */
export async function preparePublicAssets(projectRoot, runtimeDirectory) {
  const runtime = await inspect(runtimeDirectory)
  if (!runtime?.isDirectory() || runtime.isSymbolicLink())
    throw new Error(
      '.rdx/ must be a real directory, not a symbolic link or junction.'
    )

  const publicDirectory = path.join(projectRoot, 'public')
  const existing = await inspect(publicDirectory)
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
    throw new Error('public/ must be a real directory in the project root.')
  await mkdir(publicDirectory, { recursive: true })

  const destination = path.join(runtimeDirectory, 'public')
  const link = await inspect(destination)
  if (link) {
    if (!link.isSymbolicLink())
      throw new Error(
        'Cannot prepare .rdx/public: a file or directory already exists there. Move any assets to the project public/ directory, then remove the conflicting .rdx/public entry and retry. RDX has not removed it.'
      )
    let target
    try {
      target = await realpath(destination)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (target === (await realpath(publicDirectory))) return
    // Only unlink the internal pointer, never its old target or the user's files.
    await unlink(destination)
  }

  const target = process.platform === 'win32' ? publicDirectory : '../public'
  try {
    await symlink(
      target,
      destination,
      process.platform === 'win32' ? 'junction' : 'dir'
    )
  } catch (error) {
    throw new Error(
      `Could not link .rdx/public to public/: ${error.message}. Use a filesystem that supports directory links (junctions on Windows); your public files have not been removed.`
    )
  }
}
