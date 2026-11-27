/** Shared labels only: document content and author-provided names stay untouched. */
const en = {
  documentationLanguage: 'Documentation language',
  translationUnavailable: 'Translation unavailable',
  translationFallback:
    'This page is not available in {requested}. You are reading the {original} version.',
  viewOriginal: 'View the original page',
  helpTranslate: 'Help translate',
  translateThisPage: 'Translate this page',
  opensInNewTab: 'opens in a new tab',
  keyboardJoiner: 'plus',
  keyboardControl: 'Control',
  keyboardShift: 'Shift',
  keyboardAlt: 'Alt',
  keyboardCommand: 'Command',
  keyboardOption: 'Option',
  keyboardEscape: 'Escape',
  keyboardEnter: 'Enter',
  keyboardSpace: 'Space',
  keyboardPlus: 'Plus',
  keyboardArrowUp: 'Up arrow',
  keyboardArrowDown: 'Down arrow',
  keyboardArrowLeft: 'Left arrow',
  keyboardArrowRight: 'Right arrow',
  skipContent: 'Skip to content',
  mainNavigation: 'Main navigation',
  docs: 'Docs',
  changelog: 'Changelog',
  changelogFeed: 'Copy RSS feed link',
  changelogFeedCopied: 'RSS feed link copied.',
  changelogFeedCopyError: 'Could not copy the RSS feed link.',
  changelogEmpty: 'No releases yet.',
  changelogVersions: 'Versions',
  changelogFilter: 'Filter',
  changelogClearFilters: 'Clear filters',
  changelogBreakingBadge: 'Breaking changes',
  changelogSecurityBadge: 'Security',
  changelogDeprecatedBadge: 'Deprecated',
  changelogCopyLink: 'Copy link to release',
  changelogLinkCopied: 'Release link copied.',
  changelogCopyError: 'Could not copy the release link.',
  documentationPages: 'Documentation pages',
  documentationNavigation: 'Documentation navigation',
  openSidebar: 'Open sidebar',
  closeSidebar: 'Close sidebar',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  mainMenu: 'Main menu',
  back: 'Back',
  previous: 'Previous',
  next: 'Next',
  stepProgress: 'Step {current} of {total}',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  sidebarImportant: 'Important',
  sidebarNew: 'New',
  editThisPage: 'Edit this page',
  lastUpdated: 'Last updated {date}',
  related: 'Related',
  beforeYouBegin: 'Before you begin',
  onThisPage: 'On this page',
  search: 'Search…',
  searchDocumentation: 'Search documentation',
  searchPlaceholder: 'Search documentation…',
  searchDescription:
    'Search pages and sections in {version}. Use arrow keys to choose a result and Enter to open it.',
  loadingSearch: 'Loading search…',
  searchUnavailable: 'Search is unavailable.',
  tryAgain: 'Try again',
  typeToSearch: 'Type to search this documentation.',
  noResults: 'No results found.',
  navigate: 'Navigate',
  open: 'Open',
  close: 'Close',
  closeSearch: 'Close search',
  enlargeImage: 'Enlarge image: {alt}',
  closeImage: 'Close image',
  imagePreviewDescription:
    'Press Escape or use the close button to return to the document.',
  copyCode: 'Copy code',
  wrapCode: 'Wrap lines',
  showMore: 'Show more',
  showLess: 'Show less',
  codeCopied: 'Code copied to clipboard.',
  copyCodeError: 'Could not copy. Select the code and copy it manually.',
  copyRetry: 'Could not copy. Try again or copy manually.',
  copied: 'Copied!',
  copyThisPage: 'Copy this page',
  copyPageOptions: 'Page copy options',
  viewMarkdown: 'View Markdown',
  openInClaude: 'Open in Claude',
  openInChatGpt: 'Open in ChatGPT',
  openInAssistantPrompt:
    'Read {page} from the {project} documentation. Every page is listed at {index}. Use them to answer my questions about {project}.',
  pageCopied: 'Page Markdown copied to clipboard.',
  copyPageError:
    'Could not copy the page. Open View Markdown to copy it manually.',
  sectionPermalink: 'Copy link to this section',
  sectionLinkCopied: 'Section link copied to clipboard.',
  copyTab: 'Copy active tab',
  documentationTabs: 'Documentation tabs',
  tabCopied: 'Tab content copied to clipboard.',
  copyTabError: 'Could not copy. Select the tab content and copy it manually.',
  code: 'Code',
  folderTree: 'Folder',
  diagram: 'Diagram',
  showDiagram: 'Show diagram',
  showDiagramSource: 'Show diagram source',
  enlargeDiagram: 'Enlarge diagram',
  diagramLoading: 'Rendering diagram…',
  diagramError:
    'Could not render this diagram. Check the Mermaid source below.',
  table: 'Table',
  current: 'Current',
  version: 'Version {version}',
  documentationVersion: 'Documentation version: {version}',
  archived: 'Archived',
  archivedVersion: 'Archived edition',
  loadingVersions: 'Loading versions',
  preReleaseTitle: 'Pre-release documentation',
  outdatedTitle: 'Outdated documentation',
  preReleaseMessage: 'This is a pre-release version of the documentation.',
  outdatedMessage: 'This is an outdated version of the documentation.',
  backToCurrent: 'Go back to the current version',
  poweredBy: 'Powered by',
  developedBy: 'Developed by',
  modeToggle: 'Mode Toggle',
  documentationReady: 'Your documentation is ready.',
  addDocument: 'Add an .mdx file inside docs/.',
  notFound: 'Page not found',
  notFoundDescription: "We couldn't find what you were looking for.",
  brokenLink:
    'Please contact the owner of the site that led you to this link and let them know the link is broken.',
  backToDocs: 'Go back to documentation',
} satisfies Record<string, string>

export type InterfaceMessages = { [Key in keyof typeof en]: string }

/** Every English interface text: the keys of a project's `_labels.json`. */
export const interfaceTexts: readonly string[] = Object.values(en)

function languageKey(lang = 'en') {
  return lang.trim().replaceAll('_', '-').toLowerCase()
}

function placeholders(text: string) {
  return (text.match(/\{\w+\}/g) ?? []).sort().join()
}

// Static per build: catalogs register once per language, on the server when
// the project loads and in the browser through LocaleProvider.
const registered = new Map<string, Record<string, string>>()
const localized = new Map<string, InterfaceMessages>()

/** Use a project's `_labels.json` interface translations for a language. */
export function registerInterfaceLabels(
  lang: string | undefined,
  labels: Record<string, string> | undefined
) {
  const key = languageKey(lang)
  localized.delete(key)
  if (labels && Object.keys(labels).length) registered.set(key, labels)
  else registered.delete(key)
}

export function getInterfaceLabels(lang?: string) {
  return registered.get(languageKey(lang))
}

export function getMessages(lang?: string): InterfaceMessages {
  // RDX ships English only; other languages come from the project's catalog.
  const key = languageKey(lang)
  const labels = registered.get(key)
  if (!labels) return en
  let messages = localized.get(key)
  if (!messages) {
    messages = { ...en }
    for (const name of Object.keys(en) as (keyof InterfaceMessages)[]) {
      const translated = labels[en[name]]?.trim()
      // A translation that drops {version} or similar would show a broken text.
      if (translated && placeholders(translated) === placeholders(en[name]))
        messages[name] = translated
    }
    localized.set(key, messages)
  }
  return messages
}

export function formatMessage(message: string, values: Record<string, string>) {
  return message.replace(
    /\{(\w+)\}/g,
    (placeholder, key: string) => values[key] ?? placeholder
  )
}
