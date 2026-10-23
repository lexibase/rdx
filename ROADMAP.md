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

- [ ] Convergir o site oficial e o runtime instalado sem perder Canary, URLs ou
      documentação histórica. Primeira etapa: `apps/web` usa o indexador e leitor
      públicos de `@lexibase/rdx-core`, com compatibilidade para suas pastas e URLs
      existentes. Ainda falta alinhar configuração, gerenciamento de versões e
      estrutura física ao runtime/plugin atual; não confundir com migração completa.

- [ ] Personalização das cores de destaque (highlighting) da documentação.
      Oferecer paletas prontas e avaliar cores personalizadas pelo autor via
      `rdx.config.ts`, com escolha opcional durante a criação pela CLI. Definir
      quais elementos acompanham a cor (links, estados ativos, realces etc.) e
      se os temas de syntax highlighting dos code blocks serão uma opção
      separada. Preservar contraste, foco acessível, modos claro/escuro e a base
      shadcn/ui + Tailwind, sem exigir edição de `.rdx/`. A interface e o formato
      da configuração ainda serão definidos; melhoria futura, fora da 1.0.0.
- [ ] Evoluir Markdown/MDX e componentes próprios: tabelas, listas de tarefas,
      código com destaque/cópia, Callout, Tabs, Steps e Cards.
- [ ] Documentar a extensão e substituição de componentes MDX pelo usuário.
- [x] Links entre documentos, âncoras e TOC flutuante opcional (`TOC: false`
      por padrão).
- [x] Busca local opcional, desativada por padrão no `rdx.config.ts`. Implementação
      inicial: acesso pela navbar e por Ctrl+K/Command+K, modal com o Command
      oficial do shadcn/ui e Dialog na variante Base UI, navegação por teclado,
      resultados por título/conteúdo da versão consultada e carregamento sob
      demanda do índice. Sem serviço externo obrigatório. Não carregar índices
      de todas as versões na abertura de uma página nem gerar o índice quando
      a busca estiver desativada.
- [ ] Internacionalização (i18n) dos textos internos da interface, guiada pelo
      `lang` já existente no `rdx.config.ts`, por exemplo `lang: 'pt-BR'`.
      Traduzir rótulos como “On this page”, “Developed by”, os futuros
      “Powered by RDX”, textos da busca, botões, estados vazios e nomes
      acessíveis. Usar catálogos internos compartilhados e fallback previsível
      (localidade exata, idioma base, inglês), sem exigir configuração por texto.
      Não traduzir automaticamente os documentos MDX nem introduzir rotas
      multilíngues nesta etapa; o autor continua escrevendo o conteúdo no próprio
      idioma. A ideia está registrada para uma atualização futura, não implementada.
      Avaliar também perguntar o idioma durante a criação pela CLI, preenchendo
      `lang` automaticamente.
- [ ] Documentação multilíngue e seletor opcional na navbar: planejar uma
      estrutura simples por idioma (por exemplo `lang/en/` e `lang/pt-BR/`, nomes
      ainda não definidos), preservação da página ao trocar de idioma e a
      interação entre idiomas e versões. Conteúdo traduzido é fornecido pelo
      autor. Recurso futuro separado da i18n dos rótulos; não definir rotas ou
      migrar pastas existentes durante a implementação da busca.

## Final da lista

- [ ] Avaliar uma sintaxe própria sobre o pipeline Markdown/MDX. Por exemplo,
      transformar delimitadores personalizados em componentes. Primeiro definir
      os componentes e depois desenhar sintaxe, escapes, compatibilidade com
      Markdown e mensagens de erro. Nenhum delimitador foi escolhido ainda.
