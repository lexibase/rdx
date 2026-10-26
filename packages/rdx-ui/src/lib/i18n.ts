/** Shared labels only: document content and author-provided names stay untouched. */
const en = {
  skipContent: 'Skip to content',
  mainNavigation: 'Main navigation',
  docs: 'Docs',
  documentationPages: 'Documentation pages',
  documentationNavigation: 'Documentation navigation',
  openSidebar: 'Open sidebar',
  closeSidebar: 'Close sidebar',
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Previous page',
  nextPage: 'Next page',
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
  copyCode: 'Copy code',
  codeCopied: 'Code copied to clipboard.',
  copyCodeError: 'Could not copy. Select the code and copy it manually.',
  copyRetry: 'Could not copy. Try again or copy manually.',
  copied: 'Copied!',
  copyTab: 'Copy active tab',
  tabCopied: 'Tab content copied to clipboard.',
  copyTabError: 'Could not copy. Select the tab content and copy it manually.',
  code: 'Code',
  table: 'Table',
  current: 'Current',
  version: 'Version {version}',
  documentationVersion: 'Documentation version: {version}',
  archived: 'Archived',
  archivedVersion: 'Archived',
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
export type InterfaceLocale = 'en' | 'pt-BR'

const ptBR = {
  skipContent: 'Ir para o conteúdo',
  mainNavigation: 'Navegação principal',
  docs: 'Docs',
  documentationPages: 'Páginas da documentação',
  documentationNavigation: 'Navegação da documentação',
  openSidebar: 'Abrir menu lateral',
  closeSidebar: 'Fechar menu lateral',
  previous: 'Anterior',
  next: 'Próxima',
  previousPage: 'Página anterior',
  nextPage: 'Próxima página',
  onThisPage: 'Nesta página',
  search: 'Buscar…',
  searchDocumentation: 'Buscar na documentação',
  searchPlaceholder: 'Buscar na documentação…',
  searchDescription:
    'Busque páginas e seções em {version}. Use as setas para escolher um resultado e Enter para abri-lo.',
  loadingSearch: 'Carregando busca…',
  searchUnavailable: 'A busca está indisponível.',
  tryAgain: 'Tentar novamente',
  typeToSearch: 'Digite para buscar nesta documentação.',
  noResults: 'Nenhum resultado encontrado.',
  navigate: 'Navegar',
  open: 'Abrir',
  close: 'Fechar',
  closeSearch: 'Fechar busca',
  copyCode: 'Copiar código',
  codeCopied: 'Código copiado para a área de transferência.',
  copyCodeError:
    'Não foi possível copiar. Selecione o código e copie manualmente.',
  copyRetry: 'Não foi possível copiar. Tente novamente ou copie manualmente.',
  copied: 'Copiado!',
  copyTab: 'Copiar aba ativa',
  tabCopied: 'Conteúdo da aba copiado para a área de transferência.',
  copyTabError:
    'Não foi possível copiar. Selecione o conteúdo da aba e copie manualmente.',
  code: 'Código',
  table: 'Tabela',
  current: 'Atual',
  version: 'Versão {version}',
  documentationVersion: 'Versão da documentação: {version}',
  archived: 'Arquivadas',
  archivedVersion: 'Arquivada',
  loadingVersions: 'Carregando versões',
  preReleaseTitle: 'Documentação de pré-lançamento',
  outdatedTitle: 'Documentação desatualizada',
  preReleaseMessage: 'Esta é uma versão de pré-lançamento da documentação.',
  outdatedMessage: 'Esta é uma versão desatualizada da documentação.',
  backToCurrent: 'Voltar para a versão atual',
  poweredBy: 'Feito com',
  developedBy: 'Desenvolvido por',
  modeToggle: 'Alternar tema',
  documentationReady: 'Sua documentação está pronta.',
  addDocument: 'Adicione um arquivo .mdx dentro de docs/.',
  notFound: 'Página não encontrada',
  notFoundDescription: 'Não encontramos o que você estava procurando.',
  brokenLink:
    'Entre em contato com o responsável pelo site que indicou este link e informe que ele não está funcionando.',
  backToDocs: 'Voltar para a documentação',
} satisfies InterfaceMessages

/** Match the locale, then its base language; unsupported languages use English. */
export function resolveInterfaceLocale(lang = 'en'): InterfaceLocale {
  const normalized = lang.trim().replaceAll('_', '-').toLowerCase()
  if (normalized === 'pt-br' || normalized.split('-')[0] === 'pt')
    return 'pt-BR'
  return 'en'
}

export function getMessages(lang?: string): InterfaceMessages {
  return resolveInterfaceLocale(lang) === 'pt-BR' ? ptBR : en
}

export function formatMessage(message: string, values: Record<string, string>) {
  return message.replace(
    /\{(\w+)\}/g,
    (placeholder, key: string) => values[key] ?? placeholder
  )
}
