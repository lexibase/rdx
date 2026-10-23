# RDX: site oficial e ambiente de desenvolvimento

O site apresenta a evolução em Canary e mantém a documentação publicada e
arquivada. Os componentes compartilhados ficam em `packages/rdx-ui`; o motor de
conteúdo fica em `packages/rdx-core`. Uma melhoria destinada aos usuários deve
chegar aos pacotes, não existir somente nos componentes locais do site.

## Conteúdo, configuração e versões

O site usa `RdxConfig`, `createRdxProject`, o core e o plugin público de
versionamento por vínculos locais `workspace:*`, assim como os projetos gerados.
`lib/documentation.ts` mantém apenas as URLs históricas do site; não reimplementa
o indexador, a leitura do manifest ou a criação de snapshots.

- Canary: `docs/` (a fonte `current` do motor recebe o nome Canary no site).
- Publicadas e arquivadas: `versioned_docs/version-<versão>/`.
- `versions.json`: a ordem de `active` determina a versão publicada atual;
  `archived` identifica os snapshots arquivados sem mover seus arquivos.
- Links antigos como `/docs/canary/intro` continuam funcionando.
- Arquivos com nomes repetidos usam o caminho completo da categoria, sem escolher
  arbitrariamente qual documento abrir.
- Links relativos MDX e busca usam as mesmas rotas da sidebar.

Os arquivos das antigas pastas `(canary)`, `(versioned)` e `(archived)` foram
movidos sem alterar seu conteúdo. Os pacotes privados de core e versionamento
redundantes foram removidos. Os componentes e estilos aprovados continuam os mesmos.

`rdx.config.ts` é validado pelo contrato atual e ativa `versioning()` em `plugins`.
O export nomeado `siteMetadata` contém apenas metadados específicos deste site
(autor, favicon e endereço), que não são opções do contrato público atual.
Os componentes de navegador recebem somente opções serializáveis do servidor;
não importam o plugin nem código de sistema de arquivos.

Para criar uma versão do site, na raiz do monorepo:

```powershell
pnpm --filter web docs:version 3.0.0
```

O comando usa a implementação registrada pelo próprio plugin e não sobrescreve
snapshots existentes. Ele copia `docs/` e atualiza `versions.json`; não publicar nem
criar uma versão automaticamente a cada commit. Para arquivar uma versão, mova
somente seu identificador de `active` para `archived` no manifest. Não existe um
comando de arquivamento nesta etapa.

O site continua uma aplicação Next nativa para desenvolvimento; não gera uma
segunda aplicação `.rdx/` dentro de si. `docs:prepare` valida o projeto com o plugin,
sem reconstruir o manifest a partir de nomes de pastas. Não há hook `prepare` na
instalação que exija pacotes compilados antes do primeiro build do monorepo.

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
observadores de core, tipos e plugin de versionamento. Já `pnpm --filter web dev` inicia diretamente o
Next, sem a orquestração do Turbo, e não inicia os observadores.

A porta padrão continua sendo 3000. É possível definir `PORT` no ambiente para
usar outra porta, sem encerrar um servidor de desenvolvimento existente.
