# Produção com servidor Node.js

Este é o caminho de implantação base da RDX: instalar o projeto, fazer build
na raiz e iniciar o servidor pelo comando `rdx start`. Não exige uma plataforma
específica. A validação automatizada usa os pacotes `.tgz` instalados, inicia
servidores locais de produção e consulta suas rotas por HTTP.

Isso não equivale a um deploy público validado em uma hospedagem. A escolha do
provedor, domínio, HTTPS e configuração operacional continua sendo uma etapa
separada antes do lançamento. Não há publicação automática de site ou de npm.

## Preparar o projeto

Use preferencialmente uma versão de Node.js 22 ou 24 compatível com as
dependências do projeto. A matriz atual valida Linux/Node 22 e Windows/Node 24,
não todas as combinações de sistema e versão. O mínimo declarado pelos pacotes
ainda é Node >=20.9; a política definitiva da 1.0 está no checklist da release.

Escolha **um** gerenciador e mantenha seu lockfile no repositório do site.
Na máquina de destino, entre na pasta que contém `package.json` e
`rdx.config.ts`. Com pnpm e um lockfile já existente:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start --hostname 127.0.0.1 --port 3000
```

Com npm e `package-lock.json` já existente:

```sh
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Os scripts gerados são `rdx build` e `rdx start`. Os argumentos de porta e
hostname chegam ao Next.js pelo adaptador; não execute `next start` na raiz
como substituto, pois a aplicação interna fica em `.rdx/`.
Veja a [referência oficial da CLI Next.js](https://nextjs.org/docs/app/api-reference/cli/next).

A sequência base mantém a instalação completa de dependências. Instalação
apenas de produção, imagens Docker reduzidas, `standalone` e export estático
não são modalidades validadas por este guia. Não misturar lockfiles, remover
proteções de instalação ou instalar versões flutuantes para corrigir um build.

## Arquivos necessários

Mantenha o projeto completo no ambiente de build e execução:

```text
meu-projeto/
  package.json
  pnpm-lock.yaml OU package-lock.json
  rdx.config.ts
  docs/
  public/
  home.tsx                         # quando usado
  outros componentes importados  # quando usados pela configuração/home
  versions.json                   # quando o plugin estiver ativado
  versioned_docs/                 # quando existirem snapshots
  node_modules/                   # gerada pela instalação no destino
  .rdx/                           # gerada pelo build
    .next/                        # build interno do Next.js
```

Live documentation always lives in `docs/`. If you customized the plugin's
snapshot paths, keep those directories instead of its default paths.
Não copie somente `.rdx/.next`: o runtime também precisa da
configuração, componentes locais, fontes e arquivos públicos do projeto.

O build delimita os arquivos de conteúdo do servidor por meio de
`outputFileTracingIncludes`: documentos `.mdx`, `_category.json` e arquivos
de runtime declarados pelos plugins (incluindo manifests personalizados).
Isso evita rastrear a árvore inteira do projeto. Não muda a receita acima:
não significa que copiar apenas o build seja suficiente para `rdx start`, nem
constitui validação de deploy serverless ou standalone.

A receita inicial é **instalar e compilar no destino**, não transportar
`node_modules` ou builds entre Windows/Linux ou diferentes versões de Node.
Transferência de artefatos entre máquinas e mudança de caminho após o build
precisam de validação própria antes de serem anunciadas como suportadas.
Normalmente `.rdx/` não é commitada; ela é reconstruída a partir do projeto.

## Permissões e arquivos públicos

O usuário do processo precisa ler os arquivos do projeto e gravar em `.rdx/`.
Mesmo `rdx start` prepara o runtime antes de iniciar o Next.js: esse caminho não
promete um filesystem completamente somente leitura.

`public/` precisa existir como diretório real. A RDX conecta `.rdx/public` a
ele por symlink de diretório no Linux ou junction no Windows. O filesystem e a
hospedagem precisam permitir esse vínculo. Não substituir ou apagar uma pasta
conflitante sem revisar seu conteúdo; seguir a orientação do erro da CLI.

Uma imagem `public/images/logo.svg` é acessada por `/images/logo.svg`, sem
`/public` na URL. Snapshots compartilham esses ativos, portanto use nomes
distintos se uma imagem histórica precisar permanecer inalterada.

Tudo em `public/`, páginas de documentação e índices de busca é público.
Não colocar credenciais nesses conteúdos. Versões arquivadas continuam
acessíveis: arquivamento não é controle de acesso.

## Rede e ciclo de vida

O exemplo usa `127.0.0.1` para não expor diretamente o servidor. Para uma
implantação pública, configurar HTTPS e um proxy reverso ou a infraestrutura
equivalente do provedor. A documentação oficial recomenda um proxy reverso
na frente de uma aplicação Next.js auto-hospedada:
[guia de self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

Em um container ou provedor que encaminha conexões para a interface de rede,
pode ser necessário `--hostname 0.0.0.0` e a porta fornecida pela plataforma.
Não copiar uma configuração de rede sem ajustá-la ao ambiente.
Usar um supervisor de processos ou o mecanismo do provedor para manter o
servidor ativo e registrar stdout/stderr. Não usar `rdx dev` como produção.

Mudanças em configuração, MDX, componentes ou versões exigem novo build e
reinício/deploy. Busca em produção usa os índices gerados no build; não é um
serviço que indexa arquivos novos continuamente. Ao desativar a busca e
recompilar, os endpoints dos índices devem responder 404.
Reiniciar/reimplantar após adicionar ou remover arquivos públicos em produção.

Antes de expor uma release, verificar:

- `/` redireciona para `/docs` quando a homepage está desativada.
- A documentação e os arquivos CSS/JavaScript carregam sem erros.
- Imagens e downloads de `public/` respondem com o conteúdo correto.
- Uma página inexistente devolve HTTP 404.
- A busca funciona sem plugin e não mistura conteúdo atual com snapshots.
- Com busca desativada, índices atuais e históricos não ficam acessíveis.

## Validação do framework

No monorepo, executar:

```sh
pnpm check
pnpm test:release --install
```

O segundo comando cria um projeto descartável com pacotes reais, faz três
builds e inicia/encerra servidores pelo CLI instalado: documentação sem plugin;
documentação com snapshot e conteúdo atual modificado; e busca desativada após
ter sido ativada. Usa portas livres em loopback, não a porta do desenvolvedor.
Os testes de encerramento e falhas do executor fazem parte de `pnpm test`.
Essa verificação HTTP não substitui testes de hidratação, navegação por teclado
ou inspeção visual em navegador, nem confirma uma hospedagem externa.
