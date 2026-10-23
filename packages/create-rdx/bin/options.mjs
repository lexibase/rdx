export function validateProjectName(name) {
  if (!name) return 'Please enter a project name.'
  if (name.length > 214)
    return 'Use a project name with at most 214 characters.'
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name) || name.endsWith('.'))
    return 'Start with a letter or number; use only letters, numbers, dots, dashes or underscores, and do not end with a dot.'
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))
    return 'Choose a project name that is not reserved by Windows.'
  if (['node_modules', 'favicon.ico'].includes(name.toLowerCase()))
    return 'Choose a project name that is not reserved by npm.'
  return true
}

export function parseArguments(args) {
  let projectName
  let skipInstall = false
  let help = false
  let version = false
  for (const argument of args) {
    if (argument === '--skip-install') skipInstall = true
    else if (argument === '--help' || argument === '-h') help = true
    else if (argument === '--version' || argument === '-v') version = true
    else if (argument.startsWith('-'))
      throw new Error(`Unknown option "${argument}". Use --help for usage.`)
    else if (projectName !== undefined)
      throw new Error('Provide only one project name. Use --help for usage.')
    else projectName = argument
  }
  return { projectName, skipInstall, help, version }
}
