# Project Brief — Sistema de Controle para Salões Pequenos

**Autor:** Alex (Analyst) · **Data:** 2026-09-09 · **Status:** Draft para validação

---

## 1. Problema

Salões pequenos (1–5 funcionários) operam hoje com agenda de papel, caderno de caixa
e planilhas soltas. Isso gera:

- **Furos de agenda e overbooking** — dois clientes no mesmo horário/profissional.
- **Perda de receita invisível** — não se sabe quanto cada profissional/serviço rendeu.
- **Comissão calculada "no olho"** — fonte recorrente de conflito com a equipe.
- **Cliente que some** — sem histórico, não há reativação nem controle de retorno.
- **Sem visão de fim de dia** — o dono só descobre o resultado no fim do mês.

## 2. Público-alvo

| Perfil | Necessidade central |
|--------|---------------------|
| Dono/gerente (muitas vezes também atende) | Ver receita, comissão e agenda do dia em segundos |
| Profissional (2–4 por salão) | Ver a própria agenda e a própria comissão |
| Recepção (quando existe) | Marcar, remarcar, registrar pagamento |

Escala alvo: **até 5 profissionais, 1 unidade**. Não é objetivo suportar rede/franquia.

## 3. Estado atual do produto (`projetosalao`)

Já implementado: cadastro de Serviço, Profissional, Cliente e Agendamento
(status AGENDADO/CONCLUÍDO/CANCELADO, checagem de conflito de horário do profissional).
Stack: Next.js 15 + Prisma/SQLite.

O "controle" pedido é a **camada operacional e financeira** por cima dessa base.

## 4. Escopo do MVP (recomendado)

> **Decisão (2026-09-09):** as 5 features abaixo formam **um bloco único** — planejar
> como epic completo, não em entregas parciais.
> **Comissão:** modelar apenas o caso simples (**% fixo por profissional**);
> variação por serviço/produto e taxa de maquininha ficam para a fase 2.


1. **Agenda operacional** — visão dia/semana por profissional, arrastar para remarcar,
   marcar como concluído/faltou.
2. **Caixa / comandas** — ao concluir um atendimento, registrar pagamento
   (dinheiro, PIX, débito, crédito), fechar o dia com total por forma de pagamento.
3. **Comissões** — % por profissional (ou por serviço), relatório do período
   com valor a pagar por pessoa.
4. **Ficha do cliente** — histórico de atendimentos, última visita, observações.
5. **Painel do dia** — receita, nº de atendimentos, ticket médio, próximos horários.

### Fora do MVP (fase 2)

- Controle de estoque de produtos e venda de produtos avulsos.
- Lembrete automático por WhatsApp.
- Agendamento online pelo cliente (link público).
- Metas e relatórios comparativos entre meses.
- Controle de despesas fixas / fluxo de caixa completo.

## 5. Novas entidades sugeridas

| Entidade | Campos-chave |
|----------|--------------|
| `Pagamento` | agendamentoId, valor, formaPagamento, dataHora |
| `ComissaoRegra` | profissionalId, percentual (MVP: só escopo GERAL) |
| `FechamentoCaixa` | data, totalDinheiro, totalPix, totalDebito, totalCredito, observações |

`Agendamento` ganha `valorCobrado` (pode diferir do preço de tabela por desconto).

## 6. Métricas de sucesso

- Fechar o caixa do dia em < 2 min.
- Cálculo de comissão do mês sem planilha, com 1 clique.
- 0 overbooking após adoção.

## 7. Riscos e premissas

- **Premissa:** uso em desktop/tablet no balcão; mobile é secundário no MVP.
- **Premissa:** 1 salão por instância (SQLite local) — multiempresa fica para depois.
- **Risco:** regras de comissão variam muito entre salões (produto, assistente,
  taxa da maquininha). MVP cobre o caso simples; casos complexos entram na fase 2.
- **Risco:** adoção depende de a agenda ser mais rápida que o papel.

## 8. Próximos passos

1. Validar este brief (prioridade das 5 features do MVP).
2. `@pm` → PRD com requisitos funcionais (FR-*) e não-funcionais.
3. `@data-engineer` → modelagem das novas entidades e migração.
4. `@sm` → quebra em stories.
