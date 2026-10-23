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
- `pnpm test:release --install`: empacota os seis pacotes públicos, confere
  arquivos e versões internas, instala o gerador extraído do `.tgz` e cria
  um projeto isolado. Instala os outros pacotes a partir dos arquivos `.tgz`,
  ativa busca/TOC, faz build sem plugins, adiciona versionamento, cria um
  snapshot e faz build novamente.

Os testes dos pacotes não dependem de suas versões já estarem publicadas no npm.
Dependências de terceiros ainda são baixadas do registry. O projeto temporário
tem sua própria resolução de dependências; o lockfile do monorepo não o governa.
As pastas de teste ficam em `.rdx-package-smoke/`, ignoradas pelo Git.

Esta etapa não executa os testes opcionais de navegador (`test:runtime`),
comparações de screenshots ou testes HTTP com o servidor de produção iniciado.
Os builds dos projetos instalados validam a integração e a geração estática;
a validação interativa continua sendo uma etapa separada.

## Permissões e execução

As actions estão fixadas por SHA. O token tem apenas leitura de conteúdo e o
checkout não deixa credenciais disponíveis para comandos Git. O workflow usa
`pull_request`, não `pull_request_target`, e não recebe secrets de npm.
Não são usados runners próprios nem publicação automática. Novos pushes na mesma
PR cancelam a execução anterior. Cada combinação tem limite de 30 minutos.

O cache guarda o armazenamento de dependências do pnpm, não `node_modules` nem
os builds do Turbo. Assim, os builds e testes rodam em cada execução.

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
