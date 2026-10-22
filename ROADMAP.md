# RDX — prioridades de desenvolvimento

Este arquivo registra as prioridades combinadas. Itens sem marcação são
planejamento, não recursos já implementados. O layout de referência continua
sendo `apps/web`, com componentes compartilhados em `packages/rdx-ui`.

## Ajustes imediatos no projeto gerado

- [x] Explicitar `navbar: { title: '' }` no `rdx.config.ts` padrão.
- [x] Explicitar `homepage: { enabled: false }` no mesmo arquivo.
- [x] Manter `plugins` ausente no template: nenhum plugin é ativado por padrão.
- [x] Corrigir o marcador do nome do projeto no README para resistir à formatação.
- [ ] Publicar os ajustes do gerador em uma nova beta após validação e revisão.

## Próximas prioridades

- [x] Suporte completo a `public/` na raiz do projeto: criar a pasta no template,
      disponibilizar imagens, favicon e downloads em desenvolvimento e produção,
      sem exigir alterações manuais em `.rdx/`.
- [ ] Instalação e ativação assistidas de plugins pela CLI. O primeiro plugin
      deve poder adicionar o import e `plugins: [plugin()]` à configuração, sem
      apagar opções ou plugins existentes. Um comando como `rdx add versioning` é
      uma proposta, ainda não uma API implementada. Deve validar o resultado,
      evitar duplicações e pedir orientação se a configuração não puder ser
      editada com segurança. Não usar hooks de instalação para modificar o projeto
      silenciosamente ao executar `npm/pnpm add`.
- [ ] Categorias aninhadas — adiado por decisão do projeto; não alterar a sidebar
      nesta etapa. Categorias por pastas do primeiro nível já funcionam. A lacuna
      é representar, por exemplo, `docs/guias/avancado/` como subcategoria de Guias,
      em vez de agrupar todas as suas páginas diretamente em Guias. Preservar o
      layout e o comportamento que já funcionam para pastas simples.
- [ ] Testes automáticos nos PRs, incluindo verificação do workspace e testes
      de projetos gerados a partir dos pacotes empacotados.
- [ ] Melhorar erros e validação dos argumentos da CLI e a documentação de uso.
- [ ] Metadados por página, sitemap e documentação de deploy na framework.

## Depois da consolidação da base

- [ ] Evoluir Markdown/MDX e componentes próprios: tabelas, listas de tarefas,
      código com destaque/cópia, Callout, Tabs, Steps e Cards.
- [ ] Documentar a extensão e substituição de componentes MDX pelo usuário.
- [ ] Links entre documentos, âncoras e índice de títulos; busca em etapa posterior.

## Final da lista

- [ ] Avaliar uma sintaxe própria sobre o pipeline Markdown/MDX. Por exemplo,
      transformar delimitadores personalizados em componentes. Primeiro definir
      os componentes e depois desenhar sintaxe, escapes, compatibilidade com
      Markdown e mensagens de erro. Nenhum delimitador foi escolhido ainda.
