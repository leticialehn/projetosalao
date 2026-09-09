# projetosalao — Arquitetura do Epic 1 (Controle operacional e financeiro)

**Autor:** Aria (@architect) · **Data:** 2026-09-09 · **Status:** Draft
**Entrada:** `docs/prd.md` (Epic 1, stories 1.1–1.10) · `docs/brief/project-brief.md`

---

## 1. Contexto e princípios

Brownfield. A base (`Servico`, `Profissional`, `Cliente`, `Agendamento` + server actions +
páginas em `src/app/*`) permanece. Este epic adiciona uma camada financeira **sem reescrever**
o que existe.

Princípios que guiam as decisões abaixo:

1. **Cálculo financeiro fora do framework.** Toda aritmética de dinheiro vive em módulo puro
   (`src/lib/financeiro.ts`), sem Prisma, sem `next/*`. Server actions só orquestram: leem do
   banco, chamam a função pura, gravam.
2. **Uma escrita = uma transação.** Conclusão de atendimento e fechamento de caixa tocam várias
   tabelas; usam `prisma.$transaction` e nunca deixam estado parcial.
3. **Migração aditiva.** Nenhum campo novo é obrigatório sobre dados existentes; todos entram
   `?` ou com `@default`.
4. **Status como string** (padrão já adotado no schema) — não introduzir enum Prisma agora para
   não gerar migração de tipo; centralizar os literais em constante TS.
5. **Sem auth, instância única** (NFR4). Não projetar multi-tenant.

## 2. Modelo de dados

### 2.1 Alterações em entidades existentes

```prisma
model Agendamento {
  // ...campos atuais...
  valorCobrado Float?      // preço efetivamente cobrado; null enquanto AGENDADO
  status       String   @default("AGENDADO") // AGENDADO | CONCLUIDO | CANCELADO | FALTOU
  pagamentos   Pagamento[]
}

model Profissional {
  // ...campos atuais...
  comissaoPercentual Float @default(0)   // 0..100; fonte de verdade rápida p/ edição
  comissaoRegra      ComissaoRegra?
}
```

> **Decisão — `comissaoPercentual` no `Profissional` E `ComissaoRegra` separada.**
> O PRD (FR5) e a story 1.3 pedem edição simples no cadastro; a story 1.1 pede a entidade
> `ComissaoRegra` para a fase 2 (escopo por serviço). Resolução: `ComissaoRegra` é a tabela
> canônica; `Profissional.comissaoPercentual` é um **espelho denormalizado** mantido pela mesma
> server action (1.3), usado para exibição na lista. O relatório de comissão (1.8) lê de
> `ComissaoRegra`. Se preferir simplicidade absoluta no MVP, é aceitável **cortar `ComissaoRegra`
> e usar só `Profissional.comissaoPercentual`** — registrar a decisão na story 1.1. Recomendo
> manter as duas para não pagar migração na fase 2.

### 2.2 Entidades novas

```prisma
model Pagamento {
  id             String   @id @default(cuid())
  agendamento    Agendamento @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)
  agendamentoId  String
  valor          Float
  formaPagamento String   // DINHEIRO | PIX | DEBITO | CREDITO
  dataHora       DateTime @default(now())
  conferido      Boolean  @default(false)  // true quando o dia é fechado
  criadoEm       DateTime @default(now())

  @@index([dataHora])
  @@index([agendamentoId])
}

model ComissaoRegra {
  id             String   @id @default(cuid())
  profissional   Profissional @relation(fields: [profissionalId], references: [id], onDelete: Cascade)
  profissionalId String   @unique
  percentual     Float                     // 0..100
  criadoEm       DateTime @default(now())
}

model FechamentoCaixa {
  id              String   @id @default(cuid())
  data            DateTime @unique          // meia-noite local do dia fechado
  totalDinheiro   Float
  totalPix        Float
  totalDebito     Float
  totalCredito    Float
  totalGeral      Float
  qtdAtendimentos Int
  ticketMedio     Float
  observacoes     String?
  criadoEm        DateTime @default(now())
}
```

### 2.3 Estratégia de migração (story 1.1)

- Dev usa `npx prisma migrate dev --name epic1_financeiro` (introduz a pasta `prisma/migrations/`,
  hoje inexistente). Alternativa mínima já suportada pelos scripts: `npm run db:push`. **Decisão:**
  adotar `migrate dev` agora — o epic adiciona dados de negócio reais e merece histórico versionado.
  Atualizar `package.json` com `"db:migrate": "prisma migrate dev"`.
- Todos os campos novos são `?` ou `@default` → `migrate` não pede reset.
- `onDelete: Cascade` em `Pagamento` e `ComissaoRegra` evita órfãos ao excluir agendamento/profissional.

### 2.4 Índices e chave de "dia"

- "Dia" = `new Date(y, m, d, 0,0,0,0)` no fuso local do servidor. Consultas de caixa/painel filtram
  `dataHora >= inícioDoDia AND dataHora < inícioDoDiaSeguinte`. Documentar em `financeiro.ts` que o
  sistema assume um único fuso (o do salão).

## 3. Camada de lógica pura — `src/lib/financeiro.ts`

Sem imports de Prisma/Next. Trabalha sobre tipos locais simples:

```ts
export type FormaPagamento = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO";
export const FORMAS_PAGAMENTO: FormaPagamento[] = ["DINHEIRO", "PIX", "DEBITO", "CREDITO"];

export type StatusAgendamento = "AGENDADO" | "CONCLUIDO" | "CANCELADO" | "FALTOU";
export const STATUS_AGENDAMENTO: StatusAgendamento[] = ["AGENDADO","CONCLUIDO","CANCELADO","FALTOU"];

export interface PagamentoInput { valor: number; formaPagamento: FormaPagamento }
export interface AtendimentoInput { valorCobrado: number; profissionalId: string }

// arredondamento: centavos, half-up
export function reais(n: number): number;                 // Math.round(n*100)/100

export function somarPagamentos(p: PagamentoInput[]): number;
export function totaisPorForma(p: PagamentoInput[]): Record<FormaPagamento, number>;

export function resumoCaixa(pagamentos: PagamentoInput[], qtdAtendimentos: number): {
  porForma: Record<FormaPagamento, number>;
  totalGeral: number;
  ticketMedio: number;                                    // 0 se qtdAtendimentos === 0
};

export function comissao(valorCobrado: number, percentual: number): number;  // reais(v*pct/100)

export function comissaoPorProfissional(
  atendimentos: AtendimentoInput[],
  percentualPorProfissional: Record<string, number>,
): Record<string, { qtd: number; totalCobrado: number; comissao: number }>;
```

**Regras de arredondamento (AC 1.2.3):** cada `Pagamento.valor` e `valorCobrado` já é gravado com 2
casas (`reais()` na server action). Somas são de valores já arredondados. Comissão arredonda o
resultado final, não os intermediários.

**Casos de teste obrigatórios (story 1.2):** caixa vazio; 1 forma; 4 formas; atendimento
`valorCobrado = 0`; percentual 0; percentual 50; percentual 33,33 sobre R$ 80,00; ticket médio com
qtd 0; soma com centavos (0,10 + 0,20 = 0,30).

## 4. Server actions — contratos

Convenção: manter o padrão atual (`"use server"`, `FormData` de entrada, `revalidatePath`).
Actions que o usuário pode ver falhar retornam `{ ok: boolean; erro?: string }` (padrão já usado em
`criarAgendamento`). Actions "fire-and-forget" (mudar status) seguem o padrão void atual.

| Arquivo | Action | Entrada | Efeito |
|---|---|---|---|
| `src/app/agendamentos/actions.ts` | `remarcarAgendamento` | id, inicio, profissionalId | revalida conflito, atualiza início/fim/prof |
| _idem_ | `mudarStatus` (estender) | id, status ∈ {AGENDADO,CANCELADO,FALTOU} | update; **CONCLUIDO sai daqui** |
| `src/app/atendimento/actions.ts` (novo) | `concluirAtendimento` | agendamentoId, valorCobrado, pagamentos[] (JSON), cortesia? | `$transaction`: valida soma == valorCobrado (ou cortesia), grava `valorCobrado`, cria `Pagamento[]`, status→CONCLUIDO |
| `src/app/profissionais/actions.ts` (estender) | `definirComissao` | profissionalId, percentual | valida 0..100; upsert `ComissaoRegra` + espelha em `Profissional.comissaoPercentual` |
| `src/app/caixa/actions.ts` (novo) | `fecharCaixa` | data | `$transaction`: calcula `resumoCaixa`, cria `FechamentoCaixa`, marca `Pagamento.conferido=true` do dia |
| _idem_ | `reabrirCaixa` | data | `$transaction`: apaga `FechamentoCaixa`, `conferido=false` |
| `src/app/clientes/actions.ts` (estender) | `atualizarObservacoesCliente` | id, observacoes | update simples |

**`concluirAtendimento` — validação central (FR4, AC 1.4.4/1.4.5):**
```
soma = somarPagamentos(pagamentos)
se cortesia: exige pagamentos.length === 0 → grava valorCobrado = 0
senão: exige reais(soma) === reais(valorCobrado) senão { ok:false, erro:"..." }
```
Idempotência: rejeitar se o agendamento já está CONCLUIDO.

## 5. Rotas / telas (App Router)

| Rota | Story | Notas |
|---|---|---|
| `/` | 1.6 | **passa a ser a Agenda** (hoje é dashboard simples). Mover conteúdo atual de `/` para dentro do painel `/painel` ou descartar. |
| `/` (agenda) | 1.6 | Server Component: lê agendamentos do range; client component para alternância dia/semana + filtro profissional (estado em `useState` + query params para persistir na navegação de datas). |
| `/painel` | 1.9 | Server Component; usa `resumoCaixa` sobre pagamentos de hoje. |
| `/caixa` | 1.7 | `?data=YYYY-MM-DD` (default hoje). Mostra fechamento salvo se existir (read-only + reabrir). |
| `/comissoes` | 1.8 | `?de=&ate=` (default mês corrente). |
| `/clientes` + `/clientes/[id]` | 1.10 | ficha nova em `[id]`; lista ganha busca (query param `q`). |
| `/profissionais` | 1.3 | linha de edição ganha campo percentual. |

Diálogo "Concluir e receber" (1.4): client component montado sobre um `<dialog>` nativo, disparado
da agenda e da futura ficha; POST via server action. Sem lib de modal.

## 6. Constantes compartilhadas

- `src/lib/financeiro.ts` → `FORMAS_PAGAMENTO`, `STATUS_AGENDAMENTO`, tipos.
- `src/lib/format.ts` → adicionar labels: `FORMA_PAGAMENTO_LABEL`, e `FALTOU: "Faltou"` em `STATUS_LABEL`.
- `src/lib/datas.ts` (novo) → `inicioDoDia(d)`, `fimDoDia(d)`, `intervaloMes(ref)`, `parseDataParam(s)`.
  Mantém manipulação de fuso fora das actions.

## 7. Testes

- **Runner:** adicionar **Vitest** (`vitest`, `@vitest/coverage-v8` opcional) — não há runner hoje.
  Script `"test": "vitest run"`, `"test:watch": "vitest"`. Configuração mínima, ambiente `node`.
- Escopo obrigatório: `src/lib/financeiro.test.ts`, `src/lib/datas.test.ts`.
- Server actions: não exigem teste automatizado no MVP (NFR6 foca nos cálculos); cada story lista
  roteiro de teste manual.
- Gate por story: `npm run test` + `npm run lint` + `npm run build` verdes (NFR9).

## 8. Sequência de implementação e dependências

```
1.1 (schema/migração)  ─┬─> 1.2 (financeiro.ts)  ─┬─> 1.7 (caixa)
                        │                         ├─> 1.8 (comissões)  <── 1.3 (percentual)
                        │                         └─> 1.9 (painel)
                        ├─> 1.3 (percentual comissão)
                        ├─> 1.4 (concluir + pagamento)  ──> habilita dados p/ 1.7/1.8/1.9
                        ├─> 1.5 (remarcar/faltou/cancelar)
                        ├─> 1.6 (agenda dia/semana)      ──> host do diálogo 1.4
                        └─> 1.10 (ficha cliente)
```

Ordem recomendada: **1.1 → 1.2 → 1.5 → 1.6 → 1.3 → 1.4 → 1.7 → 1.9 → 1.8 → 1.10**.
1.5 e 1.6 antes de 1.4 porque a agenda é o ponto de entrada do diálogo de conclusão.

## 9. Riscos técnicos

| Risco | Mitigação |
|---|---|
| Fuso horário em "dia" (caixa/painel/comissão divergindo) | Toda lógica de data em `src/lib/datas.ts`, testada; documentar premissa de fuso único. |
| Float para dinheiro acumulando erro | `reais()` aplicado em toda gravação; somas sobre valores já arredondados; testes com centavos. |
| `/` já tem conteúdo (dashboard) | Story 1.6 explicitamente move/descarta; não deixar rota órfã. |
| `migrate dev` introduz `prisma/migrations/` num projeto que só usava `db:push` | Story 1.1 faz a transição uma vez e atualiza os scripts + README. |
| Diálogo `<dialog>` + server action + revalidação | Padrão testado manualmente na 1.4; fallback: página dedicada `/atendimento/[id]/concluir`. |

## 10. Próximos passos

- `@data-engineer`: DDL final e arquivo de migração da story 1.1, revisão de índices e `onDelete`.
- `@sm`: detalhar stories 1.1–1.10 com este documento como referência de arquitetura.
- `@ux-design-expert` (opcional): wireframe do diálogo "Concluir e receber" e da agenda semana.
