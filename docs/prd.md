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
- **NFR4:** Instância única por salão; sem multiempresa e sem autenticação multiusuário no MVP (acesso local/confiável no balcão).
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

- **Epic 1 — Controle operacional e financeiro do salão:** adicionar caixa, comissões, agenda operacional, ficha de cliente e painel do dia sobre a base de agendamento existente, entregue como MVP completo.

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
