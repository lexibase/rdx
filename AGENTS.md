# Diretrizes de desenvolvimento da RDX

## Fundação e escopo

- A RDX oferece uma experiência simples de documentação sobre **Next.js + Tailwind CSS + shadcn/ui**. Essa é a base do projeto, não apenas uma referência visual.
- Use a variante **Base UI** ao instalar ou adicionar componentes do shadcn/ui, respeitando o `components.json` do pacote. Consulte a implementação oficial antes de criar uma alternativa.
- Se o componente já existe no shadcn/ui, parta dele e adapte somente a integração com MDX, a configuração e as necessidades da documentação. Não reimplemente por conta própria a funcionalidade já fornecida pelo componente.
- Preserve o componente oficial completo, sua composição e opções. Não o substitua por uma versão própria reduzida ou apenas por alguns primitives extraídos. A ligação com MDX fica em um adaptador separado; extensões como `folder` acrescentam recursos ao componente oficial.
- Quando não existir um componente adequado, crie um componente específico de documentação, compondo os componentes do shadcn/ui quando aplicável e mantendo seu padrão visual. Callouts são um exemplo de extensão da RDX.
- Não substitua essa fundação, adicione outra biblioteca de UI ou introduza outra variante headless sem solicitação explícita do usuário.
- A RDX entrega seus recursos pela framework e pelos templates. Não dependa de adaptações feitas em um único projeto consumidor, nem altere esses projetos a partir deste repositório.

## Mapa do projeto

| Área                             | Responsabilidade                                                  |
| -------------------------------- | ----------------------------------------------------------------- |
| `apps/web`                       | Site oficial, aplicação de desenvolvimento e referência visual    |
| `packages/rdx`                   | Pacote principal, CLI pública e seleção de runtime/UI compatíveis |
| `packages/rdx-core`              | Configuração, conteúdo, Markdown, links, busca e checker          |
| `packages/rdx-ui`                | Componentes compartilhados e estilos                              |
| `packages/rdx-types`             | Contratos públicos compartilhados                                 |
| `packages/rdx-next`              | Integração Next.js, CLI/runtime, rotas geradas e metadados        |
| `packages/create-rdx`            | Gerador e template de novos projetos                              |
| `packages/rdx-plugin-versioning` | Edições de documentação e seus comandos                           |
| `packages/rdx-plugin-i18n`       | Plugin oficial de idiomas                                         |
| `packages/rdx-plugin-changelog`  | Plugin e comando de criação de release notes                      |
| `scripts`                        | Desenvolvimento, preparação/publicação e testes de instalações    |
| `config`                         | Configurações compartilhadas de TypeScript e ESLint               |

- O site oficial usa os pacotes locais via workspace. Projetos instalados usam a framework publicada e um runtime gerado em `.rdx/`. Corrigir apenas `apps/web` não corrige os projetos dos usuários: altere a implementação compartilhada e, quando aplicável, o template.
- `.rdx/`, caches, `dist`, `node_modules` e arquivos de ambiente são gerados ou locais. Não os trate como a API de customização dos projetos.
- Pontos de entrada para manutenção:
  - checker: `packages/rdx-core/src/check/`;
  - links de documentos: `packages/rdx-core/src/content/document-links.ts`;
  - IDs de títulos, compartilhados por checker e busca: `packages/rdx-core/src/mdx/heading-text.ts`. Compare com o HTML renderizado ao mexer nessa lógica;
  - componentes e exports Markdown: `packages/rdx-core/src/mdx/`;
  - catálogos `_labels.json`: `packages/rdx-core/src/config/labels.ts` e `packages/rdx-next/bin/labels-catalog.mjs`;
  - catálogos da homepage: `packages/rdx-next/bin/homepage-translations.mjs`;
  - leitura e ordenação do changelog: `packages/rdx-core/src/config/changelog.ts`.

## Experiência e aparência

- Priorize minimalismo e facilidade de autoria; não reproduza todo o catálogo de componentes.
- `apps/web` é o projeto de desenvolvimento e a referência visual. A implementação compartilhada fica em `packages/rdx-ui` e deve chegar também aos projetos gerados.
- Preserve os visuais aprovados. Prefira espaçamentos compactos, sem sacrificar legibilidade, acessibilidade, uso por teclado ou telas pequenas. Um componente visual não está validado apenas porque compilou: confira a aparência quando ela fizer parte da mudança.
- A integração MDX e uma futura sintaxe Markdown própria são camadas sobre esses componentes. Imports e plugins são opções válidas; não são proibidos.
- Use os tokens existentes, inclusive `--rdx-highlighting`. Não escolha azul ou ciano como se fossem a cor padrão da RDX. A cor de destaque é customizável e não é a mesma configuração dos temas de syntax highlighting.
- **Atlas** é o projeto fictício oficial dos exemplos. Os templates ficam em `apps/web/components/templates/`; preserve o preview em dialog, os controles por hover e a apresentação de landing page completa.
- Steps é um componente interativo com painéis, navegação, transição lateral e indicadores do passo atual. Não o transforme numa lista numerada.

## Documentação

- A documentação pública ensina o comportamento disponível, com exemplos utilizáveis. Uma funcionalidade nova, uma mudança de comportamento ou uma migração entram na documentação na mesma mudança do código: código sem documentação não está pronto.
- Nas abas de gerenciadores de pacotes (`pnpm`, `npm` e `yarn`), escreva comandos simples como texto direto no painel. Use a cópia da própria aba, sem envolver esses comandos em code blocks nem duplicar controles de cópia.
- Ensine a autoria dos componentes de documentação pela sintaxe Markdown disponível. Exemplos React pertencem à personalização de homepage/logo e às referências técnicas de API ou migração, sem exigir JSX para escrever páginas.
- Não inclua promessas, roadmap, histórico privado de desenvolvimento ou explicações sobre opções removidas nos guias de uso. Registre planejamento em `ROADMAP.md` e histórico em `CHANGELOG.md`.
- Explique limitações operacionais e de segurança quando forem necessárias para usar a RDX corretamente.
- Textos da documentação oficial seguem `LICENSE-docs`; código, exemplos e templates da CLI seguem MIT. Isso não define a licença da documentação criada pelos usuários.
- A documentação oficial é escrita em inglês. A referência de configuração fica em `apps/web/docs/02-getting-started/config.mdx`, e os frontmatters são explicados em `apps/web/docs/03-writing-documentation/create-docs.mdx`.
- `highlighting: important` usa o indicador âmbar; `highlighting: new`, o azul. Não marque páginas como importantes sem motivo, nem invente uma migração para cada minor ou patch.
- Cada major com quebra ganha uma página de migração em `05-guides`, com `highlighting: important`. As migrações ficam no fim de Guides, a mais recente primeiro: use `order` igual a 100 menos a major (93 para a 7, 95 para a 5). Liste a nova migração no início de "Previous migrations" em `updating.mdx`.
- `ROADMAP.md` contém planejamento histórico. Um item aberto não prova que a funcionalidade falta: confira o código e a documentação, e não trate o roadmap como lista automática de tarefas.

## Autoria e conteúdo

- `.md` e `.mdx` são suportados. Os componentes Markdown da RDX não exigem JSX; componentes React próprios e imports pertencem ao MDX.
- Pastas e arquivos com prefixos numéricos (`01-`) organizam a sidebar; as URLs omitem esses prefixos. `order` e `navTitle` são frontmatters disponíveis.
- O nome de uma categoria vem da pasta. A sidebar o exibe em maiúsculas por design. Para trocar ou traduzir o texto, use a seção `categories` do `_labels.json`. Desde a 7.0 o `_category.json` não é lido: não reintroduza esse arquivo, nem `categoryTitle` em páginas, que foi discutido e rejeitado.
- `related` e `prerequisites` usam caminhos relativos de documentos; `redirectFrom` registra URLs anteriores. Last updated, permalinks, edição da página, cópia de Markdown e `llms.txt` já existem: consulte suas opções antes de propô-los como novidade.
- `.rdx-document-dates.json` é cache local de datas e fica fora do Git. `_rdx-last-updated.json` dentro de um snapshot é metadata congelada da edição: não confunda os dois nem apague o segundo como cache.

## Idiomas

- O plugin de idiomas é opcional (`pnpm rdx add i18n`). Traduções de documentos ficam em `locale/<folder>/docs/`. Uma pasta `ptbr` pode representar `pt-BR`, com URLs em `/pt-br/docs/...`. Páginas não traduzidas usam a documentação principal com aviso; a busca indexa apenas o conteúdo escrito em cada idioma.
- A RDX traz o texto da interface somente em inglês. Não volte a embutir traduções. Outros idiomas usam um `_labels.json` por idioma: o do idioma principal na raiz e os das traduções em `locale/<folder>/`, com as seções `interface` e `categories`. As chaves são o texto em inglês e os nomes das categorias principais; um valor vazio mantém o original; uma tradução que perde um marcador como `{version}` é ignorada.
- `rdx i18n sync` cria e completa os catálogos (`_labels.json` e `home.json`) com valores vazios, considerando todas as edições. Ele preserva traduções, `$metadata` e chaves órfãs; só remove entradas com `--prune`. Não traduz automaticamente. `rdx check` avisa sobre entradas órfãs e marcadores perdidos.
- Os textos em inglês da interface ficam em `packages/rdx-ui/src/lib/i18n.ts` e precisam ser únicos, porque são as chaves dos catálogos.
- Para uma homepage traduzida há **um** componente, `components/home.tsx`, com `homepage: { enabled: true, translations: true }` e frases literais `t('...')`. Os textos ficam em `locale/<folder>/home.json`; frases ausentes usam o texto principal. Não volte a exigir uma cópia de `home.tsx` por idioma. `homepage.component` não se combina com `translations: true`.
- A extração de frases é estática e limitada aos usos literais. Não presuma interpolação, plurais ou rich text só porque apareceram em propostas.

## Versões, rotas e metadados

- Canary é a documentação em desenvolvimento, em `apps/web/docs/`. Não é uma versão numérica a promover ou apagar: as releases criam snapshots a partir dela.
- Há uma edição exibida por major. Um patch ou minor avança a edição da sua série, com redirects; uma major nova ganha uma entrada separada. Não crie uma edição por patch nem reconstrua `versions.json` varrendo diretórios históricos.
- O versionamento é opcional nos projetos instalados. `rdx version`, `rdx archive`, `rdx unarchive` e `rdx delete` pertencem ao plugin; arquivar mantém conteúdo e deletar remove. Consulte a ajuda e os testes antes de sugerir uma operação destrutiva.
- `basePath` é configurado em `rdx.config.ts` e o conteúdo continua escrevendo caminhos sem o prefixo. Use a integração compartilhada e o helper `withBasePath`; não some prefixos indiscriminadamente, sobretudo em caminhos que passam pelo `Link` do Next. Preserve busca, idiomas, exports, imagens e metadados nesse cenário.
- Sitemap, robots, URLs canônicas, alternates e exports Markdown são automáticos. Em um domínio com múltiplas zonas, o projeto roteador responde pelo `robots.txt` da raiz do host.

## Como trabalhar

- Converse em português brasileiro. Distinga uma pergunta de uma autorização: "o que você acha?" não significa "implemente agora". Quando a implementação for pedida, conclua o trabalho sem pedir confirmações repetidas para decisões rotineiras.
- Reproduza um bug antes de afirmar que ele existe. Leia o necessário e rode testes focados, sem revalidar tudo a cada passo.
- Use o prefixo `rdx/` em todas as branches novas, inclusive releases. Os comandos entregues ao usuário são para PowerShell, a partir da raiz do projeto.
- A `main` é protegida: não tente push direto nem abra uma PR de `main` para `main`. Depois de um squash merge, parta da `main` atualizada para uma nova branch.
- O hook de pre-commit verifica o conteúdo staged: se formatar um arquivo depois do `git add`, adicione-o de novo. Não desative o hook. O commitlint limita as linhas do corpo do commit a 100 caracteres.
- O usuário faz o merge com `gh pr merge NUMERO --squash --delete-branch`, que também apaga a branch local.
- Uma atualização do Dependabot pode trazer correções, mas o título `chore(deps)` não prova a natureza da mudança: leia o diff e as notas relevantes. Não faça merge automático, nem misture majors grandes a uma release de fixes sem revisar a compatibilidade.

## Ambiente

- pnpm fixado em 12.21.0 pelo `packageManager`. Node suportado: `^22.18.0 || ^24.11.0`. A CI roda em Ubuntu e Windows; confira `.github/workflows/ci.yml`.
- Overrides e preferências do pnpm ficam em `pnpm-workspace.yaml`, não no campo `pnpm.overrides` do `package.json`.
- Na raiz deste monorepo, `pnpm check` é a bateria completa do workspace. Num projeto criado pela CLI, `pnpm check` executa `rdx check`. São comandos diferentes.
- Pacotes cujos testes importam `dist` precisam ser compilados depois da alteração. Use o ESLint do próprio pacote: executá-lo a partir de `apps/web` pode ignorar arquivos fora daquela base.
- Escrever cache do Turbo num HDD é lento. A preparação de release usa `--ui=stream --cache=local:r`; não remova essa configuração sem medir.
- No Windows, o `tar` do Git Bash não entende caminhos `C:\`. Rode `pnpm test:release` pelo PowerShell, que usa o `tar` do sistema.

## Entrega

- Prepare releases com `pnpm release:note`, `pnpm release:plan` e `pnpm release:prepare`. Revise a severidade semântica e as notas; deixe a atualização mecânica de versões, template, changelog e snapshot para o script. Execute localmente os testes focados nas mudanças. A CI executa `pnpm check` e os testes completos de instalação; não repita essa bateria localmente durante a preparação rotineira de releases, salvo para investigar uma falha específica ou por pedido explícito do usuário.

- A RDX segue semver. Os pacotes têm versões independentes; apenas framework (`@lexibase/rdx`) e gerador (`@lexibase/create-rdx`) compartilham o número. Recomende ao usuário a severidade de cada pacote (patch para correções, minor para recursos compatíveis, major para quebras) antes de preparar a release; a decisão é dele.

- Quando o `@lexibase/rdx-ui` sobe de major, `release:prepare` move a faixa de peer do `@lexibase/rdx-next` para a nova versão e exige que o runtime entre na mesma release.

- A nota pública da release fica em `apps/web/changelog/<versão>.md`: humanizada, agrupada pelo que o leitor ganha ou precisa fazer, com links para a edição (`/docs/<versão>/...`) e usando os componentes Markdown da RDX quando ajudarem. O `CHANGELOG.md` da raiz é o registro técnico gerado pelo Changesets. A release de uma major abre a nota com o aviso da quebra e o link para a migração.

- `pnpm check` começa conferindo a formatação do repositório inteiro com o Prettier (`pnpm format:repo`); `pnpm format` corrige os arquivos. Snapshots em `versioned_docs` e arquivos gerados ficam fora, pelo `.prettierignore`.

- Mudanças visuais ou interativas passam pelos testes de navegador do `rdx-next`, que usam o Playwright: `pnpm --filter @lexibase/rdx-next test:runtime`. Instale o Chromium uma vez com `pnpm --filter @lexibase/rdx-next exec playwright install chromium`, ou aponte `RDX_BROWSER_EXECUTABLE` para um Chrome ou Edge instalado. Sem navegador, as verificações são puladas com um aviso; com `RDX_REQUIRE_BROWSER=1`, como na CI, elas falham.

- Valide as mudanças e forneça ao final a mensagem de conventional commit e os comandos para atualizar ou criar a PR.
- O usuário faz commits, merges e publicações pelo terminal. Não os execute automaticamente sem autorização explícita para essas ações.
- Não publique pacotes nem incremente versões a cada ajuste; as publicações são agrupadas quando solicitadas. Um "checado e mergeado" encerra aquela PR, mas não autoriza publicar uma versão.

- Para testar ajustes de terminal, quando solicitado, publique somente a CLI com versão prerelease e tag `beta`, mantendo a framework estável no template. Use uma branch de beta e não avance o snapshot da documentação a cada tentativa. Antes de preparar a release estável com Changesets, restaure a versão-base estável da CLI; não mescle os metadados de beta diretamente em `main`.

- Prepare cada release em uma única PR, reunindo implementação, versões dos pacotes, migrações, changelog, guias e snapshot da documentação. Valide tudo junto. Após o merge, o deploy da documentação pode ocorrer automaticamente; o usuário publica os pacotes no npm e confirma as versões, tags e instalação pelo registro. Não crie uma segunda PR apenas para liberar a documentação nem condicione o snapshot à publicação prévia no npm. Esta preferência substitui o fluxo anterior de pacotes primeiro e documentação separada.

- A publicação roda depois do merge da release, numa execução nova do workflow: `gh workflow run publish.yml --ref main -f version=X.Y.Z -f publish=true`. Um rerun mantém o commit original e lê o manifesto antigo. Se falhar, leia o erro real com `gh run view NUMERO --log-failed`. O publicador retoma uma publicação parcial pulando versões já publicadas: não incremente versões por causa de um timeout. Se `release:prepare` falhar no meio, examine o working tree antes de qualquer nova tentativa; as versões podem já ter sido aplicadas.
