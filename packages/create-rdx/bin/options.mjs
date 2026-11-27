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

/** Canonical BCP 47 tag, e.g. pt-br → pt-BR, or a message for invalid input. */
export function validateLanguage(tag) {
  if (!tag?.trim()) return 'Enter a language tag such as en, pt-BR or es-ES.'
  try {
    const [canonical] = Intl.getCanonicalLocales(tag.trim())
    if (canonical) return { canonical }
  } catch {
    // Reported below with the expected format.
  }
  return `"${tag}" is not a valid language tag. Use a tag such as en, pt-BR or es-ES.`
}

/** English interface text is built in; other languages need _labels.json. */
export function isEnglish(tag) {
  return /^en(?:-|$)/i.test(tag)
}

export function parseArguments(args) {
  let projectName
  let lang
  let skipInstall = false
  let help = false
  let version = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--lang' || argument.startsWith('--lang=')) {
      const value =
        argument === '--lang' ? args[++index] : argument.slice('--lang='.length)
      const result = validateLanguage(value)
      if (typeof result === 'string') throw new Error(result)
      lang = result.canonical
    } else if (argument === '--skip-install') skipInstall = true
    else if (argument === '--help' || argument === '-h') help = true
    else if (argument === '--version' || argument === '-v') version = true
    else if (argument.startsWith('-'))
      throw new Error(`Unknown option "${argument}". Use --help for usage.`)
    else if (projectName !== undefined)
      throw new Error('Provide only one project name. Use --help for usage.')
    else projectName = argument
  }
  return { projectName, lang, skipInstall, help, version }
}
