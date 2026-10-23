# RDX 1.0.0 — preparação para a primeira versão estável

## Decisão e escopo

A prioridade é estabilizar a primeira versão pública antes da tradução dos
textos internos. Este documento é um checklist de lançamento, não um anúncio:
os pacotes continuam em beta e nenhuma versão ou dist-tag foi alterada.

A 1.0.0 deve entregar o caminho simples que define a RDX: criar um projeto,
escrever pastas e arquivos MDX, desenvolver, fazer build e publicar o site.
Next.js + Tailwind CSS + shadcn/ui (Base UI) continuam sendo a fundação.
Preservar os visuais aprovados de `apps/web` e dos componentes compartilhados.

Busca, TOC, homepage e versionamento continuam opcionais. Tradução da interface,
documentos multilíngues, categorias aninhadas, novos componentes e sintaxe
Markdown própria ficam para depois. Não precisamos terminar o roadmap para
lançar, nem adicionar recursos novos durante a estabilização.

## Critérios de saída

### 1. Criação e recuperação de erros

- [x] Usar a mesma validação de nome no prompt e nos argumentos do gerador.
- [x] Recusar nomes/caminhos inseguros, nomes reservados e argumentos desconhecidos.
- [x] Oferecer ajuda e versão sem criar arquivos ou instalar dependências.
- [x] Não sobrescrever arquivos ou diretórios existentes.
- [x] Preservar o nome da pasta; normalizar apenas o nome npm para minúsculas.
- [x] Manter arquivos após falhas de instalação/preparação e orientar a recuperação.
- [ ] Validar o fluxo interativo real, incluindo cancelamento, com npm e pnpm
      nas plataformas suportadas. Os testes novos de erros são não interativos.
- [ ] Definir e documentar quais versões de Node e gerenciadores são suportadas.
      Hoje o runtime declara Node >=20.9, mas a matriz de CI cobre somente
      Linux/Node 22 e Windows/Node 24. Não confundir declaração com cobertura.

### 2. Contrato público e canais de distribuição

- [x] Consolidar a superfície existente em `PUBLIC_API.md` e adicionar regressões
      para entradas compiladas, padrões de configuração, aliases e tipos de plugins.
- [ ] Revisar e congelar o contrato de configuração, comandos, exports públicos,
      componentes MDX e API de plugins v1; documentar limitações e compatibilidade.
- [x] Remover o `@beta` fixo de `rdx add versioning` antes de publicar o runtime
      estável. Definir o canal pela distribuição do runtime e testar stable,
      beta e RC, sem atualizar silenciosamente plugins já instalados.
      Restaurar dependências declaradas por `install`, preservando range e seção.
- [ ] Alinhar os seis pacotes públicos, dependências internas e template para a
      candidata a lançamento. Não enviar um gerador estável que crie um projeto
      com dependências RDX ainda em beta.
- [ ] Revisar as instruções de atualização e notas da versão, incluindo a
      proteção de MDX e o fato de `.rdx/` ser gerada e descartável.

### 3. Produção e deploy

- [x] CI base validada na PR #42 em Linux/Node 22 e Windows/Node 24: workspace,
      pacotes reais, builds com busca/TOC e plugin opcional de versionamento.
- [x] Ampliar o teste dos pacotes para iniciar a produção e verificar respostas
      HTTP, arquivos públicos, busca, 404 e isolamento entre versões. Builds
      passando não são, sozinhos, uma prova de servidor funcionando.
      Inclui CSS/JS e remoção dos índices após desativar busca e refazer o build.
      Validação local Windows concluída; a CI executará esses testes novos nos
      dois sistemas após o push. Não confundir com deploy público validado.
- [x] Documentar o caminho base com servidor Node em `DEPLOYMENT.md`, incluindo
      raiz de execução, portas, dependências, dados e permissões necessários.
      A instalação local usa pacotes reais, não links de fontes do workspace.
- [ ] Validar esse roteiro em uma hospedagem escolhida para a release, sem
      arquivos ou links do monorepo de desenvolvimento e sem mudanças manuais
      em `.rdx/`. A validação HTTP local não conclui esse item.
- [ ] Definir o destino de hospedagem da validação pública com o mantenedor.
      Não prometer export estático, standalone, Vercel ou subdiretórios antes de
      testar essas modalidades. Não fazer deploy em contas externas sem autorização.
- [ ] Revisar metadados essenciais e decisões sobre indexação/sitemap; registrar
      claramente o que entra na 1.0 e o que fica como evolução compatível.

### 4. Segurança e documentação de uso

- [x] Consulta inicial: `pnpm audit --prod` em 23/10/2026 sem vulnerabilidades
      reportadas para o lockfile atual. Isso não prova ausência de vulnerabilidades.
- [ ] Repetir a revisão de dependências perto do lançamento e nos projetos
      gerados, cuja resolução pode diferir do lockfile do monorepo.
- [ ] Revisar limites de confiança: configuração, plugins e componentes são
      código confiável do projeto; MDX não é sandbox para uploads arbitrários;
      tudo em `public/` e nos índices de busca é público.
- [ ] Consolidar um guia de instalação, autoria, configuração, componentes,
      recursos opcionais, atualização e deploy, acessível ao novo usuário.

## Sequência de entrega

1. Endurecer o gerador e registrar os bloqueadores encontrados nesta revisão.
2. Resolver canais de instalação e consolidar o contrato público.
3. Validar produção dos pacotes instalados e um caminho de deploy documentado.
4. Fazer a revisão final de documentação, dependências e compatibilidade.
5. Preparar uma candidata (`1.0.0-rc.1`) quando os bloqueadores acima estiverem
   resolvidos. Escolher os canais de distribuição explicitamente nessa etapa.
6. Criar uma documentação real fora do monorepo com a candidata publicada;
   validar instalação, autoria, recursos opcionais, atualização e deploy.
7. Sem bloqueadores, preparar `1.0.0` e publicar manualmente em ordem de
   dependências com a tag `latest`. Repetir a validação pelo registry.

Commits, merges e publicações continuam sob controle do mantenedor. A autorização
para concluir a PR #42 não é uma autorização permanente para outras PRs.
