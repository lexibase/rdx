# RDX public API — 3.0

This document describes the public API prepared for RDX 3.0. Publication is
manual; see the release instructions in [PUBLISHING.md](./PUBLISHING.md).

RDX 3.0 installs the complete shadcn Code Block and Dialog compositions. Markdown
fences and image syntax stay unchanged. Custom React callers of the former
`CodeBlock` pre wrapper must choose either `MdxCodeBlock` (the Markdown adapter)
or the official composition:

```tsx
import {
  CodeBlock,
  CodeBlockContent,
} from '@lexibase/rdx/ui/components/code-block'

export function Example() {
  return (
    <CodeBlock>
      <CodeBlockContent>{'const enabled = true'}</CodeBlockContent>
    </CodeBlock>
  )
}
```

For existing pre-shaped React content, import `MdxCodeBlock` from
`@lexibase/rdx/ui/components/mdx-code-block`; it accepts pre props and a code child.
The official CodeBlock root uses div props; pass wrapping and line-number options
to `CodeBlockContent` and explicit clipboard values to `CodeBlockCopyButton`.
`DialogContent` defaults to the official centered layout; set `className` for
custom positioning/sizing and `showCloseButton` for the native close control.
Runtime 3.x requires UI ^3.0.0. The main package selects matching versions.

RDX 2.0 removes the published `ButtonLink` module. Use `Button` with `href`
from `@lexibase/rdx/ui/components/button`. See the
[upgrade guide](apps/web/docs/cat-05/updating.mdx#upgrade-from-rdx-1x-to-2x).

## Configuração e autoria

O usuário mantém `docs/`, `public/`, `rdx.config.ts` e, opcionalmente, `components/`,
`versions.json` e `versioned_docs/`. A CLI é executada na raiz do projeto.
`.rdx/` é gerada; seus arquivos, estrutura interna e caches não são uma API de
customização. Não editar templates internos instalados para configurar o site.

The recommended configuration entry is `defineConfig` from `@lexibase/rdx`.
Objetos exportados diretamente continuam aceitos. `defineConfig` valida e
devolve o mesmo objeto; não transforma componentes React em dados serializados.
Chaves desconhecidas e tipos inválidos são erros, não opções ignoradas.

Live documentation lives in the project's `docs/` folder.

| Opção                      | Contrato e padrão                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `metadata.applicationName` | Required non-empty string; the single site name for browser titles, social defaults and branding                                 |
| `metadata.since`           | Optional positive starting year, no later than the current year; the footer shows equal years once and earlier years as a range  |
| `description`              | String; padrão `''`                                                                                                              |
| `lang`                     | Non-empty string; defaults to `'en'`; selects HTML language and interface translations (`en` and `pt-BR`, with English fallback) |
| `TOC`, `search`            | Booleanos, ambos `false` por padrão; preservar a grafia `TOC`                                                                    |
| `theme.defaultTheme`       | `'system'`, `'light'` ou `'dark'`; padrão `'system'`                                                                             |
| `homepage`                 | Opcional e desativada por padrão; aceita conteúdo da Home padrão ou `component`                                                  |
| `navbar`                   | Título, componente de logo e ações opcionais; o template explicita GitHub e alternância de tema                                  |
| `plugins`                  | Array de objetos de plugins; padrão vazio; instalar um pacote não o ativa                                                        |

Detalhes e exemplos de propriedades aninhadas ficam em
[CONFIGURATION.md](./CONFIGURATION.md). The canonical public type is `RDXConfig`.
`RdxRuntimeConfig` is an alias for `RDXConfig`.

Pastas do primeiro nível formam categorias. Slugs preservam o caminho completo
do arquivo MDX, sem a extensão. Os detalhes de frontmatter, componentes e links
estão em [MDX.md](./MDX.md).

## Comandos

- `create-rdx [nome] [--skip-install]`: cria uma nova pasta; sem nome, pergunta.
  `--help`/`-h` e `--version`/`-v` são flags do **gerador**.
- `rdx dev`, `rdx build`, `rdx start`: preparam o runtime e executam o Next.js;
  argumentos adicionais são encaminhados ao respectivo comando Next.
- `rdx prepare`: valida a configuração e prepara `.rdx/` e arquivos públicos.
- `rdx add versioning [--package-manager npm|pnpm|yarn]`: instala/restaura,
  ativa explicitamente o plugin e prepara o projeto.
- `rdx version <versão>`: só existe se o plugin de versionamento estiver ativado;
  cria uma cópia da documentação e nunca sobrescreve uma versão existente.
- `rdx --help`/`rdx help`: mostra a ajuda do runtime. As flags do gerador não
  implicam que o runtime exponha exatamente as mesmas flags.

Erros operacionais encerram com código diferente de zero. Não prometer o texto
exato das mensagens, logs do Next.js ou localização dos caches como API estável.

## Entradas de pacotes

- `@lexibase/rdx`: main framework entry, reexporting configuration functions and
  types, and supplying the `rdx` command. `/runtime`, `/config`, `/styles.css` and
  `/postcss.config` provide adapter integration. `/ui/components/*`, `/ui/lib/*`,
  `/ui/providers/*`, `/ui/hooks/*` and `/ui/globals.css` expose the shared UI without bundling it.
  The package selects compatible internal releases; optional plugins remain separate.

- `@lexibase/rdx-next`: `defineConfig` e os tipos públicos reexportados para
  configuração e plugins. A importação da configuração não inicia o Next.js.
- `@lexibase/rdx-next/runtime`, `/styles.css` e `/postcss.config`: integrações do
  adaptador usadas pelo runtime gerado; não importar o runtime em código client.
  `getDocumentMetadata({ project, slug? })` reads a document's indexed title and
  description from its content source for Next.js `generateMetadata`. Empty
  documentation inherits site metadata; missing documents produce a 404.
- `@lexibase/rdx-next/config`: `getRdxTracingConfig({ rootDir, appDir? })`, para
  aplicações Next nativas usando o core. Carrega `rdx.config.ts` e retorna
  `outputFileTracingIncludes` com os arquivos de conteúdo e runtime necessários.
  `appDir` é a pasta do `next.config`, por padrão igual a `rootDir`. O runtime
  gerado já aplica esta configuração; ela não é uma opção de `rdx.config.ts`.
- `@lexibase/rdx-core`: indexação (`getDocument`, `getDocsIndex`, `getDocsPaths`),
  links (`createDocumentLinkResolver`, `RdxDocumentLinkError`), configuração
  (`createRdxProject`, `defineConfig`, `resolveConfig`, `resolveProjectPath`,
  `RdxConfigError`) e fontes/rotas (`getSourceOptions`, `resolveDocsRoute`,
  `getProjectDocsPaths`).
- `@lexibase/rdx-core/config`: as cinco funções/classes de configuração acima,
  sem carregar o renderizador MDX ou servidor Next.
- `@lexibase/rdx-core/mdx`: `remarkDocumentLinks`, `rehypeDocumentationHeadings`
  e `rehypeDocumentationCode`, para integração no pipeline MDX.
- `@lexibase/rdx-core/search`: `buildSearchIndex` e o tipo `SearchDocument`;
  o índice JSON tem `schemaVersion: 1` e deve ser validado pelo consumidor.
- `@lexibase/rdx-types`: **somente tipos**, incluindo configuração, plugins,
  fontes, documentos e busca. Usar `import type`, não esperar valores JavaScript.
- `@lexibase/rdx-ui`: usar os subpaths existentes `components/*`, `lib/*`,
  `providers/*`, `globals.css`, `postcss.config` e `postcss-plugin`. Não há um
  export raiz que reúna os componentes. Padrões em `exports` não criam módulos
  inexistentes; importações válidas precisam corresponder a arquivos publicados.
- `@lexibase/rdx-versioning`: factory nomeada `versioning`, export default
  equivalente e tipo `VersioningOptions`.

Código `bin/`, caminhos físicos `src/` e `dist/`, templates, utilitários privados
não exportados, classes CSS e a estrutura DOM dos componentes não são caminhos
para extensão com garantia de compatibilidade. Os exports públicos e suas props
documentadas são a superfície de integração; preservá-los durante cada versão major.
Os testes de contrato verificam as entradas compiladas de servidor e os padrões
de configuração; eles complementam os testes existentes de tipos, UI e pacotes.

## Plugins v1

Um plugin tem `name` único, `apiVersion: 1`, `setup` opcional e comandos opcionais.
`setup({ rootDir, config, command })` pode ser assíncrono e retornar `sources`.
Cada fonte tem `id`, `label`, `docsDir`, `routePrefix` e `badge` opcional.
IDs/prefixos são únicos; prefixos são um segmento seguro e não podem esconder
documentação existente. Fontes não são limitadas a versões pelo core.

O resultado de `setup` também pode declarar `runtimeFiles: string[]`. São arquivos
relativos à raiz que o plugin precisa ler em produção, como seu manifest. Caminhos
absolutos, fora da raiz ou a própria raiz são recusados. O core os normaliza e
deduplica em `RdxProject.runtimeFiles`; o adaptador Next exige arquivos existentes
e os inclui explicitamente no deploy. Não usar esse campo para assets públicos,
que continuam em `public/`. Plugins existentes sem esse campo continuam válidos.

Comandos têm `name`, `description` e `run(context)`, com `args: string[]` além
do contexto de plugin. Nomes reservados ou duplicados são recusados. Hooks seguem
a ordem da configuração e podem executar mais de uma vez: devem ser idempotentes
e limitar escritas aos comandos explícitos apropriados. Plugins, configuração
e componentes são código confiável do projeto, não um ambiente sandbox.

Sem o plugin ativado, `versions.json` e cópias de documentação não mudam as rotas.
Remover o plugin não apaga conteúdo. Os ativos de `public/` são compartilhados
entre versões. A segurança de MDX e limitações de autoria permanecem documentadas
em `CONFIGURATION.md`; não há chave para desabilitar a proteção de expressões.

## Canais e atualização

Na primeira instalação do plugin, a versão **do runtime instalado** escolhe o
canal: estável → `latest`, `-beta` → `beta`, `-rc` → `rc`. Não usar a versão da
documentação ou o range do runtime no projeto para decidir o canal.
Outras pré-versões exigem instalação manual; canal ausente no registry falha,
sem fallback silencioso. As tags devem estar corretas antes de liberar o runtime.

Uma dependência já declarada mas ausente é restaurada por `install`, sem passar
uma nova especificação de pacote. Não reescrever seu range, escolher outra tag,
mover de `devDependencies` para `dependencies` ou alterar políticas de segurança.
O gerenciador ainda pode atualizar o lockfile conforme suas próprias regras;
isso não é uma garantia de instalação imutável (`ci`/`--frozen-lockfile`).
Pacotes presentes e declarados não são atualizados por `rdx add`.

Atualizações futuras de RDX/dependências exigem uma operação explícita do autor.
Na linha estável, alterações incompatíveis da API pública exigem uma nova major;
novas opções compatíveis podem chegar em minor e correções em patch.
Beta e RC continuam canais de avaliação, separados de `latest`.
