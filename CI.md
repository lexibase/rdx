# Validação automática das PRs

O workflow `.github/workflows/ci.yml` executa em toda PR, em pushes para `main`
e manualmente pela aba Actions. Não publica no npm, não cria commits e não faz
merge. Não exige tokens ou secrets de publicação.

## O que é verificado

- Linux com Node.js 22 e Windows com Node.js 24. São duas combinações de teste,
  não uma matriz de todas as versões de Node em todos os sistemas.
- A versão do pnpm declarada em `packageManager`, sem atualizar o gerenciador.
- Instalação com `--frozen-lockfile`: divergências do lockfile falham o check.
- `pnpm check`: lint, tipos, builds e testes unitários existentes.
  O lint de `web` depende do build de `rdx-core`, pois seus imports públicos
  apontam para `dist/`. O Turbo prepara esse pacote também em checkouts limpos.
- `pnpm test:release --install`: empacota os seis pacotes públicos, confere
  arquivos e versões internas, instala o gerador extraído do `.tgz` e cria
  um projeto isolado. Instala os outros pacotes a partir dos arquivos `.tgz`,
  ativa busca/TOC, faz build sem plugins, adiciona versionamento, cria um
  snapshot e altera o conteúdo atual. Faz três builds (sem plugin, com versões
  e com busca desativada), iniciando o CLI de produção instalado após cada um.
  Verifica HTTP, redirects, páginas, 404, CSS/JS, ativos públicos e isolamento
  dos índices e páginas entre conteúdo atual e snapshot.

Os testes dos pacotes não dependem de suas versões já estarem publicadas no npm.
Dependências de terceiros ainda são baixadas do registry. O projeto temporário
tem sua própria resolução de dependências; o lockfile do monorepo não o governa.
As pastas de teste ficam em `.rdx-package-smoke/`, ignoradas pelo Git.

Os servidores temporários usam portas livres em `127.0.0.1` e são encerrados
após sucesso ou falha. O executor possui testes de encerramento e falhas de
startup incluídos em `pnpm test`. Não para servidores do desenvolvedor.
Esta etapa não executa os testes opcionais de navegador (`test:runtime`) nem
comparações de screenshots; a validação interativa continua separada.
O caminho base de produção é documentado em [DEPLOYMENT.md](./DEPLOYMENT.md),
sem deploy externo automático.

## Permissões e execução

As actions estão fixadas por SHA. O token tem apenas leitura de conteúdo e o
checkout não deixa credenciais disponíveis para comandos Git. O workflow usa
`pull_request`, não `pull_request_target`, e não recebe secrets de npm.
Não são usados runners próprios nem publicação automática. Novos pushes na mesma
PR cancelam a execução anterior. Cada combinação tem limite de 30 minutos.

O cache guarda o armazenamento de dependências do pnpm, não `node_modules` nem
os builds do Turbo. Assim, os builds e testes rodam em cada execução.

O `.gitattributes` mantém arquivos de texto com quebras de linha LF também no
checkout do Windows, alinhadas ao Prettier. Arquivos binários não são convertidos.
Não é necessário alterar a configuração global do Git ou flexibilizar o lint.

PRs de forks podem precisar de aprovação para executar Actions, conforme as
políticas do GitHub e da organização. Não é preciso relaxar essas políticas.

## Como acompanhar pelo terminal

Depois de criar a PR:

```powershell
gh pr checks --watch
gh run list --workflow ci.yml --limit 5
gh run view <ID> --log-failed
```

Rodar Actions e tornar o resultado obrigatório são coisas diferentes. Depois
da primeira execução, o administrador pode selecionar os dois checks `Validate`
nas regras de proteção da `main`. Este ajuste não altera essas regras.

Para reproduzir as verificações localmente, sem publicar:

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test:release --install
```
