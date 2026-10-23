# RDX: site oficial e ambiente de desenvolvimento

O site apresenta a evolução em Canary e mantém a documentação publicada e
arquivada. Os componentes compartilhados ficam em `packages/rdx-ui`; o motor de
conteúdo fica em `packages/rdx-core`. Uma melhoria destinada aos usuários deve
chegar aos pacotes, não existir somente nos componentes locais do site.

## Migração incremental

O site já usa `getDocsIndex` e `getDocument` de `@lexibase/rdx-core` para páginas,
sidebar e busca. `lib/documentation.ts` mantém somente a compatibilidade com as
pastas históricas e URLs do site; não é outro indexador Markdown.

- Canary: `app/docs/(canary)`.
- Publicadas: `app/docs/(versioned)/version-<versão>`.
- Arquivadas: `app/docs/(archived)/version-<versão>`.
- Links antigos como `/docs/canary/intro` continuam funcionando.
- Arquivos com nomes repetidos usam o caminho completo da categoria, sem escolher
  arbitrariamente qual documento abrir.
- Links relativos MDX e busca usam as mesmas rotas da sidebar.

Nenhuma pasta histórica foi movida nesta etapa. O pacote redundante
`packages/rdx-legacy-core` foi removido após migrar seus consumidores e testes.
O helper de apresentação das
versões e o comando de geração de `versions.json` ainda vêm do pacote privado
`@rdx/rdx-versioning`. Alinhar esses pontos, configuração e armazenamento ao plugin
atual é uma etapa posterior, com preservação dos arquivos e URLs.

O build com Turbopack ainda avisa sobre rastreamento amplo de arquivos nas funções
dinâmicas do core público. Os documentos do site estão incluídos explicitamente em
`next.config.js`, mas a redução desse rastreamento é uma pendência antes de validar
o deploy público; não esconder o aviso nem considerar a migração concluída.

## Validação

Na raiz do monorepo, `pnpm check` inclui testes do site com o core público e um
servidor de produção em porta temporária. Eles verificam todas as páginas das
edições existentes, busca isolada por versão, componentes MDX e respostas 404.
Não ocupam nem encerram o servidor de desenvolvimento da porta 3000.

## Desenvolvimento local

Na raiz, basta executar `pnpm dev`. O Turbo prepara os builds das dependências
antes de iniciar o site e mantém os pacotes compilados em modo de observação:

- Core, runtime Next e plugin de versões recompilam os arquivos locais de `src/`
  para `dist/` quando são alterados.
- Tipos sincronizam alterações, adições e remoções de declarações.
- A UI já é consumida diretamente de `packages/rdx-ui/src` pelo Next, sem build
  intermediário; estilos e componentes continuam com Fast Refresh.

Não é necessário publicar no npm para testar. Os vínculos continuam sendo
`workspace:*`. O modo de observação não limpa `dist/` a cada alteração.

Para trabalhar somente no site e nos pacotes compilados que ele consome, execute
`pnpm exec turbo run dev --filter=web` na raiz. Esse comando também inicia os
observadores de core e tipos. Já `pnpm --filter web dev` inicia diretamente o
Next, sem a orquestração do Turbo, e não inicia os observadores.

A porta padrão continua sendo 3000. É possível definir `PORT` no ambiente para
usar outra porta, sem encerrar um servidor de desenvolvimento existente.
