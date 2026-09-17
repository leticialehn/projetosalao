# projetosalao — Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Permitir que um salão de até 5 profissionais opere agenda, caixa e comissões sem papel nem planilha.
- Fechar o caixa do dia (total por forma de pagamento) em menos de 2 minutos.
- Calcular a comissão a pagar por profissional em um período com 1 clique, sem cálculo manual.
- Dar ao dono uma visão do dia (receita, atendimentos, ticket médio) em tempo real.
- Manter histórico por cliente (atendimentos, última visita, observações) para retorno e fidelização.
- Eliminar overbooking de profissional.

### Background Context

O `projetosalao` já entrega a base de agendamento: cadastro de Serviço, Profissional, Cliente e
Agendamento com checagem de conflito de horário. O que falta é a camada **operacional e financeira**
que transforma a agenda em controle de negócio: registrar o que foi efetivamente pago, fechar o dia,
apurar comissões e enxergar resultado. Hoje isso é feito em caderno e planilha, o que gera perda de
receita invisível, conflito de comissão com a equipe e ausência de visão gerencial.

Este PRD cobre um único MVP (um epic), entregue como bloco completo, para 1 salão / 1 unidade.
A regra de comissão do MVP é apenas **percentual fixo por profissional**; variação por serviço,
taxa de maquininha, estoque de produtos, lembretes por WhatsApp e agendamento online do cliente
ficam explicitamente para a fase 2.

### Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-09-09 | 0.1     | Draft inicial a partir do brief      | Morgan (@pm)  |
| 2026-09-10 | 0.2     | Epic 2 (segurança + refino financeiro), FR15–FR22, NFR10–NFR13 | Morgan (@pm) |

## Requirements

### Functional

- **FR1:** O sistema registra um ou mais pagamentos para um agendamento concluído, cada um com valor e forma de pagamento (DINHEIRO, PIX, DEBITO, CREDITO).
- **FR2:** Ao concluir um atendimento, o sistema propõe o valor de tabela do serviço como valor a cobrar, permitindo ao operador ajustá-lo (desconto/acréscimo) antes de registrar o pagamento.
- **FR3:** O sistema armazena o valor efetivamente cobrado no agendamento, separado do preço de tabela do serviço.
- **FR4:** Um agendamento só pode ser marcado como CONCLUIDO quando houver pagamento(s) registrado(s) cuja soma seja igual ao valor cobrado, ou o operador confirma explicitamente conclusão sem pagamento (ex.: cortesia).
- **FR5:** O sistema permite definir um percentual de comissão por profissional (escopo geral, aplicado a todo atendimento concluído por ele).
- **FR6:** O sistema calcula, para um intervalo de datas, o total atendido e a comissão devida por profissional, com base no valor cobrado dos agendamentos CONCLUIDO no período.
- **FR7:** O sistema gera o fechamento de caixa de um dia: total geral e subtotal por forma de pagamento, número de atendimentos e ticket médio.
- **FR8:** O fechamento de caixa de um dia pode ser persistido (registro de FechamentoCaixa) com observações e, uma vez fechado, os pagamentos daquele dia ficam sinalizados como conferidos.
- **FR9:** A agenda oferece visão por dia e por semana, filtrável por profissional, mostrando horários livres e ocupados.
- **FR10:** O operador pode remarcar um agendamento (alterar início/fim e/ou profissional) respeitando a checagem de conflito existente.
- **FR11:** O operador pode marcar um agendamento como FALTOU (no-show), distinto de CANCELADO.
- **FR12:** A ficha do cliente exibe dados de contato, observações, histórico de agendamentos (data, serviço, profissional, valor, status) e a data da última visita concluída.
- **FR13:** O painel do dia exibe, para a data corrente: receita realizada, nº de atendimentos concluídos, ticket médio e a lista dos próximos horários.
- **FR14:** O sistema mantém os cadastros já existentes (Serviço, Profissional, Cliente, Agendamento) e adiciona o campo de percentual de comissão à edição de Profissional.

### Non Functional

- **NFR1:** Stack mantida: Next.js 15 (App Router) + TypeScript, Prisma + SQLite, server actions, CSS puro (sem Tailwind).
- **NFR2:** Todas as strings de interface em português do Brasil (pt-BR).
- **NFR3:** Valores monetários armazenados de forma consistente (Float em reais, 2 casas) e formatados como moeda BRL na interface.
- **NFR4:** Instância única por salão; sem multiempresa e sem autenticação multiusuário no MVP (acesso local/confiável no balcão). _[Parcialmente substituída na v0.2 — ver NFR10: o Epic 2 introduz autenticação; a parte "instância única / sem multiempresa" continua válida.]_
- **NFR5:** Operação otimizada para desktop/tablet no balcão; layout utilizável em tela pequena, mas mobile não é prioridade.
- **NFR6:** Cálculos financeiros (fechamento, comissão) devem ser determinísticos e cobertos por testes unitários.
- **NFR7:** Operações de escrita usam server actions com validação de entrada; erros retornam mensagem clara em pt-BR.
- **NFR8:** Nenhuma migração pode destruir dados existentes de agendamento; novos campos entram com default seguro.
- **NFR9:** `next build`, `npm run lint` e o typecheck devem passar antes de cada story ser considerada concluída.

## User Interface Design Goals

### Overall UX Vision

Ferramenta de balcão: rápida, poucos cliques, sem telas de configuração no caminho da operação diária.
O fluxo central é "cliente chega → atende → recebe → próximo". Telas gerenciais (comissão, fechamento)
são secundárias e acessadas pelo dono ao final do turno.

### Key Interaction Paradigms

- Agenda como tela inicial; clicar num horário livre cria agendamento, clicar num ocupado abre ações.
- Concluir atendimento e registrar pagamento no mesmo diálogo (um passo).
- Ações destrutivas (cancelar, faltou) exigem confirmação.
- Filtros de profissional e navegação de data sempre visíveis na agenda.

### Core Screens and Views

- Agenda (dia/semana, por profissional) — tela inicial
- Diálogo de atendimento (criar / concluir + pagamento)
- Painel do dia
- Fechamento de caixa
- Relatório de comissões (período)
- Lista e ficha de cliente
- Cadastros: serviços, profissionais (com % de comissão), clientes

### Accessibility: None

Sem meta formal de WCAG no MVP; manter contraste legível e navegação por teclado nos diálogos.

### Branding

Sem identidade definida. Visual limpo e neutro, tipografia do sistema, CSS puro. Paleta a definir
com o dono; não bloqueia o MVP.

### Target Device and Platforms: Web Responsive

Prioridade desktop/tablet; responsivo o suficiente para consulta em celular.

## Technical Assumptions

### Repository Structure: Monorepo

Repositório único já existente (`projetosalao`).

### Service Architecture

Monólito Next.js App Router com server actions; sem serviço externo. Persistência local via
Prisma/SQLite (`prisma/dev.db`). Sem API pública no MVP.

### Testing Requirements

Unit + testes de lógica financeira. Prioridade absoluta em testes unitários para os cálculos de
fechamento de caixa e comissão (funções puras isoladas das server actions). Testes de fluxo manual
documentados nas stories. E2E fora de escopo no MVP.

### Additional Technical Assumptions and Requests

- Novas entidades Prisma: `Pagamento`, `ComissaoRegra` (apenas escopo geral), `FechamentoCaixa`.
- `Agendamento` ganha `valorCobrado: Float?` e passa a aceitar status `FALTOU`.
- `Profissional` ganha `comissaoPercentual: Float @default(0)`.
- Lógica de dinheiro em módulo puro (`src/lib/`), sem acesso a DB, para testabilidade.
- Seed atualizado para incluir regras de comissão e alguns pagamentos de exemplo.
- Scripts existentes mantidos: `npm run db:seed`, `npm run db:reset`, `npx next dev`.

## Epic List

- **Epic 1 — Controle operacional e financeiro do salão:** adicionar caixa, comissões, agenda operacional, ficha de cliente e painel do dia sobre a base de agendamento existente, entregue como MVP completo. **(Done — 2026-09-10, QA 9 PASS / 1 CONCERNS)**
- **Epic 2 — Segurança de acesso e refinamento financeiro:** login e papéis (dono/balcão), taxa de maquininha no caixa e comissão por serviço / sobre líquido. Pré-requisito para publicar a URL. **(Done — 2026-09-17, stories 2.1–2.5)**
- **Epic 3 — Controle de estoque:** cadastro de produtos, movimentação manual e alerta de estoque baixo. **(Done — 2026-09-16, QA 3 PASS)**
- **Epic 6 — Acesso do profissional:** novo papel `PROFISSIONAL`, vínculo com o cadastro de profissional existente, agenda individual responsiva para uso no celular. **(Done — 2026-09-17, stories 6.1–6.2)**
- **Epic 7 — Metas & Performance:** metas de faturamento/comissão (salão e por profissional), ranking do período e notificações individualizadas de incentivo. Depende do Epic 6 para a parte de notificação individual. **(Done — 2026-09-17, stories 7.1–7.3, QA gate PASS)**

Epic único por decisão de escopo (2026-09-09): as cinco áreas se sustentam mutuamente
(caixa depende de valor cobrado, comissão depende de caixa, painel depende de ambos) e o valor
só se realiza quando o salão consegue rodar o dia inteiro no sistema.

## Epic 1 — Controle operacional e financeiro do salão

**Objetivo expandido:** transformar a agenda atual em um sistema de controle de negócio. Ao final
do epic, um salão de até 5 profissionais consegue marcar e remarcar atendimentos, registrar o que
foi pago e como, fechar o caixa do dia, apurar a comissão de cada profissional em qualquer período
e acompanhar o resultado do dia — tudo sem sair do sistema.

### Story 1.1 — Modelo de dados financeiro e de comissão

As a desenvolvedor,
I want as novas entidades e campos no schema Prisma com migração não destrutiva,
so that as demais stories tenham base para gravar pagamentos, comissões e fechamentos.

#### Acceptance Criteria

1: `schema.prisma` inclui `Pagamento` (id, agendamentoId, valor, formaPagamento, dataHora, conferido default false, criadoEm).
2: `schema.prisma` inclui `ComissaoRegra` (id, profissionalId único, percentual, criadoEm) e `FechamentoCaixa` (id, data única, totalDinheiro, totalPix, totalDebito, totalCredito, totalGeral, qtdAtendimentos, ticketMedio, observacoes, criadoEm).
3: `Agendamento` ganha `valorCobrado Float?`; o comentário de status passa a listar AGENDADO, CONCLUIDO, CANCELADO, FALTOU.
4: `Profissional` ganha `comissaoPercentual Float @default(0)`.
5: A migração aplica em cima de um banco com dados existentes sem apagar agendamentos, serviços, profissionais ou clientes.
6: `npm run db:seed` popula pelo menos 2 regras de comissão e alguns pagamentos de exemplo consistentes com agendamentos concluídos.
7: `next build` e typecheck passam.

### Story 1.2 — Módulo puro de cálculo financeiro

As a desenvolvedor,
I want funções puras para somar pagamentos, calcular fechamento de caixa e comissão,
so that a lógica financeira seja determinística e testável isolada do banco.

#### Acceptance Criteria

1: `src/lib/financeiro.ts` expõe funções puras: agrupar pagamentos por forma, calcular totais/ticket médio de um conjunto de atendimentos, calcular comissão dado (valor cobrado, percentual).
2: As funções não importam Prisma nem acessam I/O.
3: Arredondamento monetário para 2 casas é consistente e documentado.
4: Testes unitários cobrem: caixa vazio, múltiplas formas de pagamento, atendimento sem valor cobrado, percentual 0, percentual 50, valores com centavos.
5: `npm run lint` e typecheck passam; todos os testes passam.

### Story 1.3 — Percentual de comissão por profissional

As a dono do salão,
I want definir o percentual de comissão de cada profissional,
so that o sistema possa apurar quanto pagar sem cálculo manual.

#### Acceptance Criteria

1: A tela de edição de Profissional mostra e permite salvar `comissaoPercentual` (0 a 100, aceita decimais).
2: Salvar cria ou atualiza a `ComissaoRegra` do profissional via server action com validação.
3: Valor inválido (negativo, > 100, não numérico) retorna mensagem em pt-BR e não grava.
4: A lista de profissionais exibe o percentual atual de cada um.

### Story 1.4 — Concluir atendimento com registro de pagamento

As a operador do balcão,
I want concluir um atendimento e registrar o pagamento no mesmo passo,
so that o caixa reflita a receita real sem etapa separada.

#### Acceptance Criteria

1: Na agenda, um agendamento AGENDADO tem ação "Concluir e receber" que abre um diálogo.
2: O diálogo pré-preenche o valor cobrado com o preço de tabela do serviço e permite editá-lo.
3: O operador adiciona uma ou mais linhas de pagamento (valor + forma); a soma é exibida e comparada ao valor cobrado.
4: Confirmar com soma igual ao valor cobrado grava `valorCobrado`, cria os `Pagamento` e muda o status para CONCLUIDO (FR1–FR4).
5: Se a soma difere do valor cobrado, o sistema bloqueia, salvo a opção explícita "concluir sem pagamento (cortesia)", que grava valorCobrado 0 e nenhum pagamento.
6: Todas as escritas em uma única server action transacional; erro não deixa estado parcial.

### Story 1.5 — Remarcar, cancelar e marcar falta

As a operador do balcão,
I want remarcar um atendimento ou marcá-lo como falta/cancelado,
so that a agenda reflita o que realmente aconteceu.

#### Acceptance Criteria

1: Um agendamento AGENDADO permite alterar início/fim e profissional, reaplicando a checagem de conflito existente.
2: Conflito de horário do profissional bloqueia a remarcação com mensagem em pt-BR.
3: Ações "Cancelar" e "Faltou" mudam o status correspondente e pedem confirmação.
4: Agendamentos CANCELADO e FALTOU não entram em nenhum cálculo de caixa, comissão ou painel.
5: O histórico do agendamento preserva o status final.

### Story 1.6 — Agenda dia/semana por profissional

As a operador do balcão,
I want ver a agenda por dia e por semana filtrando por profissional,
so that eu enxergue rapidamente horários livres e ocupados.

#### Acceptance Criteria

1: A agenda tem alternância dia/semana e navegação para data anterior/próxima e "hoje".
2: Filtro por profissional (um ou todos); a seleção persiste durante a navegação de datas.
3: Horários ocupados mostram cliente, serviço, profissional e status por cor/rótulo.
4: Clicar num espaço livre abre a criação de agendamento já com data/hora/profissional pré-preenchidos.
5: A agenda é a rota inicial da aplicação.

### Story 1.7 — Fechamento de caixa do dia

As a dono do salão,
I want fechar o caixa de um dia e ver o total por forma de pagamento,
so that eu confira o dinheiro do dia em menos de 2 minutos.

#### Acceptance Criteria

1: A tela de fechamento recebe uma data (default hoje) e lista os pagamentos do dia com totais por forma, total geral, qtd de atendimentos e ticket médio (via `src/lib/financeiro.ts`).
2: "Fechar caixa" persiste um `FechamentoCaixa` com esses valores e observações opcionais, e marca os pagamentos do dia como `conferido = true`.
3: Um dia já fechado exibe o registro salvo e é somente leitura, com opção de reabrir (que limpa `conferido` e remove o `FechamentoCaixa`) mediante confirmação.
4: Dias sem pagamento podem ser fechados com zeros.
5: Os totais do fechamento batem com a soma dos pagamentos individuais listados.

### Story 1.8 — Relatório de comissões por período

As a dono do salão,
I want ver a comissão devida a cada profissional em um intervalo de datas,
so that eu pague a equipe sem planilha.

#### Acceptance Criteria

1: A tela recebe data inicial e final (default: mês corrente) e lista, por profissional: nº de atendimentos concluídos, total cobrado e comissão devida (percentual vigente × total cobrado).
2: O cálculo considera apenas agendamentos CONCLUIDO com `valorCobrado` no período.
3: Profissionais sem atendimento no período aparecem com zeros.
4: Há um total geral de comissões do período.
5: O cálculo usa as funções puras de `src/lib/financeiro.ts` e é coberto por teste.

### Story 1.9 — Painel do dia

As a dono do salão,
I want um painel com o resultado do dia corrente,
so that eu acompanhe receita e movimento em tempo real.

#### Acceptance Criteria

1: O painel exibe, para hoje: receita realizada (soma dos pagamentos), nº de atendimentos concluídos, ticket médio e nº de agendamentos ainda pendentes.
2: Lista os próximos horários do dia (cliente, serviço, profissional, hora).
3: Os números se atualizam ao recarregar após uma conclusão de atendimento.
4: Estado vazio (nenhum atendimento ainda) é tratado com mensagem clara.

### Story 1.10 — Ficha do cliente com histórico

As a operador do balcão,
I want abrir a ficha de um cliente e ver seu histórico,
so that eu conheça o cliente e saiba quando foi a última visita.

#### Acceptance Criteria

1: A lista de clientes permite busca por nome/telefone e abre a ficha.
2: A ficha mostra contato, observações (editáveis) e a data da última visita concluída.
3: O histórico lista agendamentos do cliente (data, serviço, profissional, valor cobrado, status), mais recentes primeiro.
4: A ficha tem atalho para criar um novo agendamento já com o cliente selecionado.

## Epic 2 — Segurança de acesso e refinamento financeiro

**Status:** Draft (2026-09-10, Morgan @pm). Epic 1 entregue e validado pelo QA (9 PASS, 1 CONCERNS);
deploy no Railway preparado. Este epic cobre a "fase 2" que o MVP deixou explicitamente de fora.

**Objetivo expandido:** tornar o sistema seguro para operar publicamente (login) e aproximar os
números do dinheiro real do salão (taxa de maquininha, comissão por serviço). Ao final, o dono pode
publicar o app sem expor dados e confia que caixa e comissões refletem o líquido, não o bruto.

### Contexto e mudança de premissa

O MVP assumiu **NFR4** (acesso local/confiável no balcão, sem autenticação). Com o deploy numa URL
pública essa premissa cai: qualquer pessoa com o link acessa clientes, telefones, faturamento e
comissões. Autenticação passa de "fora de escopo" a **pré-requisito de uso real** — por isso é a
primeira story do epic e bloqueia a divulgação da URL.

### Requisitos adicionais

#### Functional (fase 2)

- **FR15:** O acesso a todas as rotas do app (exceto a tela de login e, futuramente, o agendamento
  online público) exige autenticação.
- **FR16:** O sistema suporta pelo menos dois papéis: **dono** (acesso total, incl. cadastros e
  relatórios) e **balcão** (agenda, atendimento, caixa do dia; sem editar % de comissão nem excluir
  cadastros). Um único usuário "dono" é suficiente para começar.
- **FR17:** A sessão expira por inatividade e há ação explícita de "sair".
- **FR18:** Cada forma de pagamento pode ter uma **taxa da adquirente** (% e/ou valor fixo por
  transação) configurável; DINHEIRO e PIX default 0.
- **FR19:** O fechamento de caixa passa a exibir, além do bruto por forma, o **líquido** (bruto menos
  taxa) e o total de taxas do dia.
- **FR20:** A comissão pode ser calculada sobre o **valor líquido** (após taxa da maquininha) ou o
  bruto — decisão configurável por salão, default bruto (comportamento atual).
- **FR21:** Além do percentual geral por profissional, é possível definir um percentual de comissão
  **por serviço** para um profissional; quando existir, ele prevalece sobre o percentual geral.
- **FR22:** O relatório de comissões detalha, por profissional, a quebra por serviço quando houver
  regra específica.

#### Non Functional (fase 2)

- **NFR10:** Substitui a parte de autenticação da NFR4 — o app agora exige login; segue instância
  única por salão (sem multiempresa).
- **NFR11:** Senhas armazenadas com hash forte (bcrypt/argon2); nunca em texto puro; nenhum segredo
  no repositório (usar variável de ambiente para a chave de sessão).
- **NFR12:** Migrações continuam não destrutivas (NFR8); novas colunas de taxa/comissão entram com
  default que preserva o cálculo atual.
- **NFR13:** Mudança no cálculo de comissão/caixa exige atualização dos testes unitários de
  `src/lib/financeiro.ts` (NFR6).

### Sequência das stories

| Ordem | Story | Depende de | Prioridade |
|-------|-------|-----------|-----------|
| 2.1 | Login do salão (sessão + rota protegida) | — | **Bloqueador — antes de divulgar a URL** |
| 2.2 | Papéis dono/balcão e restrições de ação | 2.1 | Alta |
| 2.3 | Taxa de maquininha por forma de pagamento (config + caixa líquido) | Epic 1 (1.7) | Alta |
| 2.4 | Comissão por serviço (regra específica prevalece) | Epic 1 (1.3, 1.8) | Média |
| 2.5 | Comissão sobre líquido vs bruto (toggle) | 2.3, 2.4 | Média |
| 2.6+ | Agendamento online, lembrete WhatsApp, estoque, metas | — | Epics próprios (fase 3) |

Agendamento online, WhatsApp, estoque e metas **não** entram neste epic: cada um é um módulo com
escopo e riscos próprios (rota pública, API externa paga, nova entidade, dataviz). Serão epics
separados após o 2 fechar.

### Story 2.1 — Login do salão

As a dono do salão,
I want proteger o acesso ao sistema com um login,
so that os dados do salão não fiquem abertos a quem tiver o link.

#### Acceptance Criteria

1: Existe uma rota `/login` com formulário (usuário + senha) fora da área protegida.
2: Todas as demais rotas redirecionam para `/login` quando não há sessão válida (middleware ou guarda
   em layout de servidor).
3: A credencial inicial do "dono" é definida por variável de ambiente (usuário + hash da senha) ou
   por um comando de seed que grava um `Usuario` com senha em hash; nunca há senha em texto no repo.
4: Sessão mantida por cookie assinado/HTTP-only; chave de assinatura vem de variável de ambiente.
5: Há ação "Sair" visível no layout que encerra a sessão.
6: Sessão expira após período de inatividade configurável (default 12 h).
7: Tentativa de login inválida retorna mensagem genérica em pt-BR ("usuário ou senha inválidos"),
   sem revelar qual campo falhou.
8: `next build`, `npm run lint`, typecheck e os testes passam; migração (se houver entidade `Usuario`)
   é não destrutiva.

### Story 2.2 — Papéis dono e balcão

As a dono do salão,
I want que o operador de balcão não consiga alterar comissões nem apagar cadastros,
so that mudanças sensíveis fiquem só comigo.

#### Acceptance Criteria

1: `Usuario` tem um campo `papel` ("DONO" | "BALCAO").
2: Rotas/ações restritas ao dono: definir % de comissão, taxas de maquininha, excluir
   serviço/profissional/cliente, reabrir caixa de dias anteriores.
3: O balcão acessa: agenda, criar/concluir/remarcar/cancelar atendimento, caixa do dia corrente,
   painel, ficha de cliente (leitura + observações).
4: Ação negada por papel retorna mensagem clara em pt-BR e não executa a operação (checagem no
   servidor, não só escondendo botão).
5: O layout esconde os controles que o papel atual não pode usar.
6: Pelo menos um teste cobre a checagem de autorização no servidor.

### Story 2.3 — Taxa de maquininha por forma de pagamento

As a dono do salão,
I want registrar a taxa que a maquininha cobra por forma de pagamento,
so that o caixa mostre quanto de fato entrou na conta.

#### Acceptance Criteria

1: Nova entidade `TaxaPagamento` (forma única, percentual, valorFixo, ativo) ou campos equivalentes;
   DINHEIRO e PIX default 0.
2: Tela de configuração (acesso dono) para editar as taxas.
3: `src/lib/financeiro.ts` ganha função pura que, dado um pagamento (valor, forma) e a taxa vigente,
   retorna o líquido; coberta por testes (incl. taxa 0, só %, só fixo, ambos).
4: O fechamento de caixa (`/caixa`) exibe, por forma: bruto, taxa, líquido; e o total de taxas do dia.
5: `FechamentoCaixa` passa a persistir o total líquido e o total de taxas (colunas novas com default
   0; migração não destrutiva).
6: O painel do dia e o relatório de comissões continuam funcionando (sem regressão); a comissão
   segue sobre o bruto nesta story (o toggle é a Story 2.5).

### Story 2.4 — Comissão por serviço

As a dono do salão,
I want definir uma comissão diferente para um serviço específico de um profissional,
so that serviços com custo de produto ou margem diferente sejam remunerados de forma justa.

#### Acceptance Criteria

1: `ComissaoRegra` passa a aceitar escopo por serviço: além da regra geral (serviço nulo), regras
   com `servicoId` preenchido para o mesmo profissional (migração não destrutiva; a unicidade muda
   de `profissionalId` para `(profissionalId, servicoId)` com `servicoId` nulo = regra geral).
2: `src/lib/financeiro.ts`: a resolução do percentual de um atendimento passa a ser "regra do serviço
   se existir, senão regra geral, senão 0"; função pura coberta por testes.
3: A tela de edição de profissional lista os serviços e permite definir % por serviço (opcional).
4: O relatório de comissões (`/comissoes`) detalha a quebra por serviço quando houver regra
   específica; o total por profissional continua correto.
5: Sem regra específica, o comportamento é idêntico ao Epic 1 (regressão coberta por teste).

### Story 2.5 — Comissão sobre líquido ou bruto

As a dono do salão,
I want escolher se a comissão incide sobre o valor bruto ou o líquido (após taxa da maquininha),
so that eu não pague comissão sobre um dinheiro que a adquirente reteve.

#### Acceptance Criteria

1: Configuração única do salão (`Config` ou similar): `comissaoBase` = "BRUTO" | "LIQUIDO", default
   "BRUTO".
2: Quando "LIQUIDO", o cálculo de comissão usa o valor líquido do(s) pagamento(s) do atendimento
   (rateado proporcionalmente se houver mais de uma forma).
3: `src/lib/financeiro.ts`: função de comissão por profissional recebe a base e as taxas; coberta por
   testes nos dois modos.
4: O relatório de comissões indica qual base está em uso no período exibido.
5: Trocar a configuração afeta apenas relatórios gerados depois (sem histórico de base — documentar
   como limitação, igual ao percentual no Epic 1).

## Epic 3 — Controle de estoque

**Status:** Draft (2026-09-14, Morgan @pm). Epic 1 e Epic 2 entregues e validados pelo QA. Este epic
cobre o primeiro item da lista "fase 3" (`2.6+`): controle de estoque de produtos.

**Objetivo:** o dono passa a saber quanto tem de cada produto (revenda ou insumo), registra entradas
e saídas manualmente, e é avisado quando um produto está acabando — sem depender de planilha paralela.

### Escopo desta primeira fatia

Fora de escopo nesta fatia (candidatos a uma fatia 3b, se o dono validar a necessidade depois de usar):
baixa automática de estoque ao concluir um atendimento (vincular produto/insumo a um serviço), venda de
produto avulsa dentro do fluxo de caixa, relatório de consumo por período. Fica de fora por ora porque
a dependência (mapear qual serviço consome qual produto/quantidade) é uma modelagem própria que merece
validação com o dono antes de comprometer — YAGNI até a fatia 1 provar que o controle manual não basta.

### Requisitos adicionais

#### Functional

- **FR23:** O dono cadastra produtos (nome, categoria opcional, unidade de medida, estoque mínimo,
  estoque atual). Ação restrita a `PAPEL_DONO`.
- **FR24:** O dono registra movimentações manuais de estoque (entrada — compra/reposição; saída —
  uso/perda/ajuste), cada uma com quantidade, motivo e data; o estoque atual do produto é recalculado
  a partir do histórico de movimentações.
- **FR25:** Uma tela lista os produtos com estoque atual abaixo do estoque mínimo configurado (alerta
  de reposição).
- **FR26:** Balcão (`PAPEL_BALCAO`) pode visualizar o estoque atual e registrar saída (uso/perda), mas
  não cadastra produto novo nem edita o estoque mínimo — mesma lógica de restrição já usada em
  comissão (Epic 2).

#### Non Functional

- **NFR14:** Migração aditiva (tabelas novas `Produto` e `MovimentoEstoque`); não altera nenhuma
  tabela existente.
- **NFR15:** Estoque atual nunca é editado diretamente — é sempre a soma das movimentações, para manter
  histórico auditável (mesmo princípio de `Pagamento` vs. caixa do Epic 1/2).

### Sequência das stories

| Ordem | Story | Depende de | Prioridade |
|-------|-------|-----------|-----------|
| 3.1 | Cadastro de produtos | Epic 2 (papéis) | Alta — base para as demais |
| 3.2 | Movimentação de estoque (entrada/saída manual) | 3.1 | Alta |
| 3.3 | Alerta de estoque baixo | 3.1, 3.2 | Média |

### Story 3.1 — Cadastro de produtos

As a dono do salão,
I want cadastrar os produtos que uso ou revendo, com um estoque mínimo de referência,
so that eu tenha uma lista única de produtos em vez de controlar em papel ou planilha.

#### Acceptance Criteria

1: Tela `/produtos` (protegida, `PAPEL_DONO` cria/edita) lista produtos com nome, categoria, estoque
   atual e estoque mínimo.
2: Cadastro de produto: nome (obrigatório), categoria (texto livre, opcional), unidade de medida
   (ex.: un, ml, g — texto livre), estoque mínimo (número, default 0). Estoque atual inicia em 0 e só
   muda via movimentação (Story 3.2) — cadastro não define estoque atual diretamente.
3: Produto pode ser inativado (soft delete via `ativo`, mesmo padrão de `Servico`/`Profissional`) em
   vez de excluído, preservando o histórico de movimentações já lançadas.
4: `PAPEL_BALCAO` acessa a listagem (somente leitura) mas não vê/usa os controles de criar/editar.

## Epic 6 — Acesso do profissional

**Status:** Draft (2026-09-17, Morgan @pm). Epic 1, 2 e 3 entregues. Este epic introduz o primeiro
acesso ao sistema que não é `DONO` nem `BALCAO`: o próprio profissional que atende.

**Objetivo:** cada profissional acessa, pelo navegador do celular, a própria agenda — e só a própria
agenda, sem ver atendimentos de outros profissionais nem telas de caixa/comissões/cadastro.

### Escopo desta primeira fatia

Fora de escopo nesta fatia: troca de senha pelo próprio profissional, edição de perfil, qualquer tela
além da agenda (mesmo dados relacionados aos próprios atendimentos, como a própria comissão — isso é
tratado no Epic 7), e aplicativo nativo (a entrega aqui é o mesmo sistema web, responsivo para celular,
não um app publicado em loja).

### Requisitos adicionais

#### Functional

- **FR27:** Novo papel `PAPEL_PROFISSIONAL`. O dono cadastra o login (usuário/senha) de um profissional
  e vincula esse login a um registro `Profissional` já existente (relação um-para-um).
- **FR28:** Um usuário logado com papel `PROFISSIONAL` vê, na agenda, somente os atendimentos do
  `Profissional` ao qual está vinculado — nenhuma outra tela (caixa, comissões de terceiros, clientes,
  cadastros) fica acessível a esse papel.
- **FR29:** A agenda (e as demais telas acessíveis ao papel `PROFISSIONAL`) é responsiva, com uso
  confortável em tela de celular.

#### Non Functional

- **NFR16:** O vínculo `Usuario` ↔ `Profissional` é um-para-um; um `Usuario` com papel `PROFISSIONAL`
  sem vínculo não deve conseguir usar o sistema de forma útil — a falha é explícita, não um erro genérico.
- **NFR17:** Nenhuma mudança de comportamento para os papéis `DONO`/`BALCAO` já existentes.

### Sequência das stories

| Ordem | Story | Depende de | Prioridade |
|-------|-------|-----------|-----------|
| 6.1 | Papel `PROFISSIONAL` + vínculo `Usuario`↔`Profissional` + cadastro pelo dono | Epic 2 (papéis) | Alta — base para as demais |
| 6.2 | Agenda do profissional logado (escopada ao próprio profissional, responsiva) | 6.1 | Alta |

## Epic 7 — Metas & Performance

**Status:** Draft (2026-09-17, Morgan @pm). Depende do Epic 1 (dados de faturamento/comissão já
calculados) para as stories 7.1/7.2, e do **Epic 6** para a story 7.3 (notificação individual precisa
saber quem está logado).

**Objetivo:** o dono define metas de faturamento — do salão e, opcionalmente, por profissional — e o
sistema acompanha o progresso automaticamente a partir dos pagamentos já registrados, sem input manual
adicional. Profissionais recebem avisos individualizados de incentivo.

### Escopo desta primeira fatia

Fora de escopo nesta fatia: notificação por push/e-mail/WhatsApp fora do sistema (é um módulo à parte,
com custo de API externa), badges/gamificação, recompensas automáticas atreladas a meta batida.

### Requisitos adicionais

#### Functional

- **FR30:** O dono define uma meta de faturamento do salão para um período (ex.: um mês) e,
  opcionalmente, uma meta por profissional (faturamento ou comissão).
- **FR31:** O progresso da meta é calculado automaticamente a partir dos pagamentos/comissões já
  registrados no período coberto pela meta — nenhum lançamento manual adicional.
- **FR32:** Uma tela de ranking compara profissionais num período (faturamento, comissão ou número de
  atendimentos).
- **FR33:** Quando uma meta é batida, a notificação segue duas regras: a meta do salão e as metas de
  outros profissionais aparecem para todos; uma mensagem de incentivo ou de quanto falta para bater a
  própria meta aparece **somente** para o profissional dono daquela meta (requer Epic 6, para saber
  quem está logado).

#### Non Functional

- **NFR18:** Modelo de dados aditivo (nova tabela `Meta`), sem alterar nenhuma tabela existente.
- **NFR19:** O cálculo de progresso reusa as mesmas funções puras já usadas por Caixa/Comissões
  (`src/lib/financeiro.ts`) — nenhuma lógica financeira duplicada.

### Sequência das stories

| Ordem | Story | Depende de | Prioridade |
|-------|-------|-----------|-----------|
| 7.1 | Modelo de meta + tela do dono para definir metas | Epic 1 | Alta — base para as demais |
| 7.2 | Acompanhamento de progresso + ranking do período | 7.1 | Alta |
| 7.3 | Notificações (meta batida pública + incentivo individual) | 7.1, 7.2, **Epic 6** | Média |

## Next Steps

### UX Expert Prompt

Usar este PRD como entrada para desenhar os fluxos de balcão do Epic 1, com foco no diálogo
"Concluir e receber" e na agenda dia/semana. Entregar wireframes de baixa fidelidade das Core
Screens e um mini design system em CSS puro (tokens de cor, espaçamento, tipografia do sistema).

### Architect Prompt

Usar este PRD para produzir a arquitetura do Epic 1: modelo Prisma final (Pagamento, ComissaoRegra,
FechamentoCaixa, campos novos), contrato das server actions, organização de `src/lib/financeiro.ts`
como módulo puro, estratégia de migração não destrutiva e plano de testes unitários dos cálculos
financeiros.
