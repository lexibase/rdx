# RDX: site oficial e ambiente de desenvolvimento

O site apresenta a evolução em Canary e mantém a documentação publicada e
arquivada. Os componentes compartilhados ficam em `packages/rdx-ui`; o motor de
conteúdo fica em `packages/rdx-core`. Uma melhoria destinada aos usuários deve
chegar aos pacotes, não existir somente nos componentes locais do site.

## Conteúdo, configuração e versões

O site usa `RDXConfig`, `createRdxProject`, o core e o plugin público de
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
Site SEO is configured in `metadata` inside `defineConfig`, using the same
validated public contract and Next.js metadata adapter as CLI-generated projects.
There is no separate `siteMetadata` export. Set `metadata.metadataBase` to the
public deployment URL and keep referenced icons and share images in `public/`.
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

O `next.config.js` usa `getRdxTracingConfig` do adaptador compartilhado. Ele inclui
explicitamente os documentos e `_category.json` de cada fonte configurada, além
dos arquivos de runtime declarados pelos plugins (como o manifest de versões).
As leituras dinâmicas do core não rastreiam mais a árvore inteira do projeto.
Há testes dos arquivos efetivamente listados para o deploy e das páginas em
produção. Isso não substitui a validação de uma hospedagem pública.

## Validação

Na raiz do monorepo, `pnpm check` inclui testes do site com o core público e um
servidor de produção em porta temporária. Eles verificam todas as páginas das
edições existentes, busca isolada por versão, componentes MDX e respostas 404.
Não ocupam nem encerram o servidor de desenvolvimento da porta 3000.

## Desenvolvimento local

Na raiz, basta executar `pnpm dev`. O coordenador local em Node prepara os builds
das dependências pelo Turbo e inicia os processos contínuos diretamente, sem
camadas de `pnpm.CMD` para cada observador no Windows:

- Core, runtime Next e plugin de versões recompilam os arquivos locais de `src/`
  para `dist/` quando são alterados.
- Tipos sincronizam alterações, adições e remoções de declarações.
- A UI já é consumida diretamente de `packages/rdx-ui/src` pelo Next, sem build
  intermediário; estilos e componentes continuam com Fast Refresh.

Não é necessário publicar no npm para testar. Os vínculos continuam sendo
`workspace:*`. O modo de observação não limpa `dist/` a cada alteração.

Use um único `Ctrl+C` para encerrar o servidor e seus observadores. No terminal
interativo, o coordenador captura essa tecla antes que ela seja propagada aos
arquivos batch do gerenciador e restaura o modo original do terminal ao terminar.
No Windows, os processos compartilham a sessão do terminal original, inclusive
os workers internos do Next, sem abrir uma janela separada de `next-server`.
Somente as árvores de processos iniciadas por essa execução são encerradas; não
há comandos que matem todos os processos Node. Cancelamento intencional retorna
sucesso, mas uma falha real de build ou processo mantém saída diferente de zero.

`pnpm --filter web dev` e `pnpm exec turbo run dev --filter=web` continuam sendo
atalhos avançados, mas não passam pelo coordenador e não oferecem esse tratamento
de encerramento. O primeiro também não inicia os observadores dos pacotes. Para
o fluxo completo e o encerramento coordenado, prefira `pnpm dev` na raiz.

A porta padrão continua sendo 3000. É possível definir `PORT` no ambiente para
usar outra porta, sem encerrar um servidor de desenvolvimento existente.
