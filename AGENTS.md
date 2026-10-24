# Diretrizes de desenvolvimento da RDX

## Fundação e escopo

- A RDX oferece uma experiência simples de documentação sobre **Next.js + Tailwind CSS + shadcn/ui**. Essa é a base do projeto, não apenas uma referência visual.
- Use a variante **Base UI** ao instalar ou adicionar componentes do shadcn/ui, respeitando o `components.json` do pacote. Consulte a implementação oficial antes de criar uma alternativa.
- Se o componente já existe no shadcn/ui, parta dele e adapte somente a integração com MDX, a configuração e as necessidades da documentação. Não reimplemente por conta própria a funcionalidade já fornecida pelo componente.
- Quando não existir um componente adequado, crie um componente específico de documentação, compondo os componentes do shadcn/ui quando aplicável e mantendo seu padrão visual. Callouts são um exemplo de extensão da RDX.
- Não substitua essa fundação, adicione outra biblioteca de UI ou introduza outra variante headless sem solicitação explícita do usuário.

## Experiência e aparência

- Priorize minimalismo e facilidade de autoria; não reproduza todo o catálogo de componentes.
- `apps/web` é o projeto de desenvolvimento e a referência visual. A implementação compartilhada fica em `packages/rdx-ui` e deve chegar também aos projetos gerados.
- Preserve os visuais aprovados. Prefira espaçamentos compactos, sem sacrificar legibilidade, acessibilidade, uso por teclado ou telas pequenas.
- A integração MDX e uma futura sintaxe Markdown própria são camadas sobre esses componentes. Imports e plugins são opções válidas; não são proibidos.

## Documentação

- A documentação pública ensina o comportamento disponível, com exemplos utilizáveis.
- Não inclua promessas, roadmap, histórico privado de desenvolvimento ou explicações sobre opções removidas nos guias de uso. Registre planejamento em `ROADMAP.md` e histórico em `CHANGELOG.md`.
- Explique limitações operacionais e de segurança quando forem necessárias para usar a RDX corretamente.
- Textos da documentação oficial seguem `LICENSE-docs`; código, exemplos e templates da CLI seguem MIT. Isso não define a licença da documentação criada pelos usuários.

## Entrega

- Valide as mudanças e forneça ao final a mensagem de conventional commit e os comandos para atualizar ou criar a PR.
- O usuário faz commits, merges e publicações pelo terminal. Não os execute automaticamente sem autorização explícita para essas ações.
- Não publique pacotes nem incremente versões a cada ajuste; as publicações são agrupadas quando solicitadas.
