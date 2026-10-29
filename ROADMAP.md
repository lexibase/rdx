# RDX — prioridades de desenvolvimento

Este arquivo registra as prioridades combinadas. Itens sem marcação são
planejamento, não recursos já implementados. O layout de referência continua
sendo `apps/web`, com componentes compartilhados em `packages/rdx-ui`.

## Ajustes imediatos no projeto gerado

- [x] Explicitar `navbar: { title: '' }` no `rdx.config.ts` padrão.
- [x] Explicitar `homepage: { enabled: false }` no mesmo arquivo.
- [x] Manter `plugins` ausente no template: nenhum plugin é ativado por padrão.
- [x] Corrigir o marcador do nome do projeto no README para resistir à formatação.
- [x] Publicar os ajustes do gerador em uma nova beta após validação e revisão.

## Próximas prioridades

- [ ] Preparar a primeira versão estável **antes da tradução da interface**.
      Seguir o checklist e os bloqueadores de `RELEASE_READINESS.md`. Estabilizar
      a experiência atual sem adicionar recursos ou alterar versões a cada ajuste.
- [x] Suporte completo a `public/` na raiz do projeto: criar a pasta no template,
      disponibilizar imagens, favicon e downloads em desenvolvimento e produção,
      sem exigir alterações manuais em `.rdx/`.
- [x] Instalação e ativação assistidas do versionamento pela CLI, com
      `rdx add versioning`. O primeiro plugin
      deve poder adicionar o import e `plugins: [plugin()]` à configuração, sem
      apagar opções ou plugins existentes. A implementação valida o resultado,
      evita duplicações e fornece orientação se a configuração não puder ser
      editada com segurança. Não usar hooks de instalação para modificar o projeto
      silenciosamente ao executar `npm/pnpm add`.
- [ ] Expandir o catálogo de instalação assistida à medida que surgirem novos
      plugins oficiais. A implementação inicial suporta apenas `versioning`.
- [ ] Categorias aninhadas — adiado por decisão do projeto; não alterar a sidebar
      nesta etapa. Categorias por pastas do primeiro nível já funcionam. A lacuna
      é representar, por exemplo, `docs/guias/avancado/` como subcategoria de Guias,
      em vez de agrupar todas as suas páginas diretamente em Guias. Preservar o
      layout e o comportamento que já funcionam para pastas simples.
- [x] Testes automáticos nos PRs, incluindo verificação do workspace e testes
      de projetos gerados a partir dos pacotes empacotados.
      Workflow em Linux/Node 22 e Windows/Node 24, sem publicação automática.
      A execução remota começa após enviar a PR; detalhes em `CI.md`.
- [ ] Melhorar erros e validação dos argumentos da CLI e a documentação de uso.
      Primeira etapa: validação compartilhada do gerador, ajuda, proteção de
      destinos existentes e recuperação de falhas; conclusão completa depende
      das validações interativas e documentação da release.
- [ ] Metadados por página, sitemap e documentação de deploy na framework.

## Depois da consolidação da base

- [x] Manter uma edição publicada por major. Releases atualizam o número e o
      conteúdo dessa edição; uma nova major preserva a anterior. Canary/Current
      permanece independente. URLs substituídas redirecionam para a edição da
      mesma major, sem duplicar o seletor ou os índices de busca. Arquivos
      históricos permanecem no projeto e linhas arquivadas mantêm seu estado.

- [x] Alinhar configuração, leitura de conteúdo e versionamento do site oficial ao
      motor dos projetos instalados. `apps/web` usa `RDXConfig`, `createRdxProject`
      e o plugin atual via `workspace:*`, com `docs/` e `versioned_docs/`. Preservar
      Canary, URLs e snapshots. O adaptador de URLs do site é intencional; ele
      mantém os endereços antigos sem duplicar o motor ou mudar o visual.

- [x] Personalização das cores de destaque por `rdx.css` opcional, usando
      `--rdx-highlighting` em `:root` e `.dark`. Integrar links, foco e estados
      selecionados aos tokens do shadcn/ui, preservando os padrões existentes,
      as cores semânticas dos Callouts e o tema de syntax highlighting.
- [ ] Avaliar paletas prontas e escolha opcional da cor durante a criação pela CLI.
- [ ] Evoluir Markdown/MDX e componentes próprios: tabelas, listas de tarefas,
      código com destaque/cópia, Callout, Tabs, Steps e Cards.
- [ ] Syntax highlighting personalizado nos code blocks — adiado para uma
      atualização futura. Permitir registrar gramáticas TextMate e temas
      claro/escuro do Shiki pelo `rdx.config.ts`, com arquivos do projeto
      organizados, por exemplo, em `syntax/`. O nome registrado deve funcionar
      como linguagem do fence Markdown, sem imports na página nem edição de
      `.rdx/`. Definir a API e validar arquivos, aliases, dependências entre
      gramáticas e cores antes da implementação. Semantic Highlighting de
      extensões VS Code não é uma gramática TextMate: avaliar separadamente
      adaptações que aproveitem as regras da linguagem, sem prometer conversão
      automática ou exigir um language server para renderizar a documentação.
- [x] Modo `folder` nos code blocks: listas com dois espaços por nível geram
      árvores com linhas de conexão. Visual compacto e cópia do desenho gerado.
      Implementado; aguarda publicação agrupada e lançamento dos guias públicos.
- [ ] Documentar a extensão e substituição de componentes MDX pelo usuário.
- [x] Code blocks de diff, no estilo Git: distinguir linhas adicionadas e
      removidas, com marcadores `+`/`-` e realces acessíveis nos temas claro e
      escuro. Autoria com fences `diff` e cópia integral do patch, mantendo o
      bloco compacto. Implementado; aguarda publicação agrupada e guias públicos.
- [x] Links entre documentos, âncoras e TOC flutuante opcional (`TOC: false`
      por padrão).
- [x] Busca local opcional, desativada por padrão no `rdx.config.ts`. Implementação
      inicial: acesso pela navbar e por Ctrl+K/Command+K, modal com o Command
      oficial do shadcn/ui e Dialog na variante Base UI, navegação por teclado,
      resultados por título/conteúdo da versão consultada e carregamento sob
      demanda do índice. Sem serviço externo obrigatório. Não carregar índices
      de todas as versões na abertura de uma página nem gerar o índice quando
      a busca estiver desativada.
- [x] Internacionalização (i18n) dos textos internos, guiada por `lang` no
      `rdx.config.ts`, com catálogos compartilhados em inglês e português
      brasileiro. Busca, TOC, navegação, cópia, créditos, avisos e nomes acessíveis
      usam a mesma localidade no servidor e no navegador. Localidades portuguesas
      usam pt-BR; idiomas sem catálogo usam inglês. Conteúdo MDX e nomes
      personalizados permanecem como escritos pelo autor.
- [ ] Avaliar perguntar o idioma durante a criação pela CLI, preenchendo
      `lang` automaticamente.
- [ ] Documentação multilíngue e seletor opcional na navbar: planejar uma
      estrutura simples por idioma (por exemplo `lang/en/` e `lang/pt-BR/`, nomes
      ainda não definidos), preservação da página ao trocar de idioma e a
      interação entre idiomas e versões. Conteúdo traduzido é fornecido pelo
      autor. Recurso futuro separado da i18n dos rótulos; não definir rotas ou
      migrar pastas existentes durante a implementação da busca.

## Final da lista

- [x] Primeira camada de autoria Markdown sobre os componentes existentes:
      Callouts com `> [!NOTE]`, `TIP`, `SUCCESS`, `WARNING` e `DANGER`;
      `:::tabs` e `:::accordion` com títulos `###`; teclas com `:kbd[Ctrl]`.
      Preservar JSX, escapes, exemplos em fences, links e busca por versão.
- [ ] Avaliar outras extensões de Markdown conforme as necessidades de autoria.
