// Módulo puro de cálculo financeiro.
// NÃO importa Prisma, next/* nem faz I/O. Toda entrada é passada por parâmetro.

export type FormaPagamento = "DINHEIRO" | "PIX" | "DEBITO" | "CREDITO";
export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "DINHEIRO",
  "PIX",
  "DEBITO",
  "CREDITO",
];

export type StatusAgendamento =
  | "AGENDADO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "FALTOU";
export const STATUS_AGENDAMENTO: StatusAgendamento[] = [
  "AGENDADO",
  "CONCLUIDO",
  "CANCELADO",
  "FALTOU",
];

export interface PagamentoInput {
  valor: number;
  formaPagamento: FormaPagamento;
}

export interface AtendimentoInput {
  valorCobrado: number;
  profissionalId: string;
}

/**
 * Arredonda um valor monetário para centavos, half-up.
 * `Math.round` já é half-up para positivos; o `+` em `n * 100` evita
 * lixo de ponto flutuante (ex.: `0.1 + 0.2` → `0.30000000000000004`).
 */
export function reais(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function somarPagamentos(p: PagamentoInput[]): number {
  return reais(p.reduce((acc, x) => acc + x.valor, 0));
}

export function totaisPorForma(
  p: PagamentoInput[],
): Record<FormaPagamento, number> {
  const base = {
    DINHEIRO: 0,
    PIX: 0,
    DEBITO: 0,
    CREDITO: 0,
  } as Record<FormaPagamento, number>;
  for (const x of p) {
    base[x.formaPagamento] = reais(base[x.formaPagamento] + x.valor);
  }
  return base;
}

export function resumoCaixa(
  pagamentos: PagamentoInput[],
  qtdAtendimentos: number,
): {
  porForma: Record<FormaPagamento, number>;
  totalGeral: number;
  ticketMedio: number;
} {
  const porForma = totaisPorForma(pagamentos);
  const totalGeral = somarPagamentos(pagamentos);
  const ticketMedio =
    qtdAtendimentos > 0 ? reais(totalGeral / qtdAtendimentos) : 0;
  return { porForma, totalGeral, ticketMedio };
}

/** Comissão sobre um valor cobrado. Arredonda só o resultado final. */
export function comissao(valorCobrado: number, percentual: number): number {
  return reais((valorCobrado * percentual) / 100);
}

export function comissaoPorProfissional(
  atendimentos: AtendimentoInput[],
  percentualPorProfissional: Record<string, number>,
): Record<string, { qtd: number; totalCobrado: number; comissao: number }> {
  const acc: Record<
    string,
    { qtd: number; totalCobrado: number; comissao: number }
  > = {};

  for (const a of atendimentos) {
    const atual = acc[a.profissionalId] ?? {
      qtd: 0,
      totalCobrado: 0,
      comissao: 0,
    };
    atual.qtd += 1;
    atual.totalCobrado = reais(atual.totalCobrado + a.valorCobrado);
    acc[a.profissionalId] = atual;
  }

  for (const id of Object.keys(acc)) {
    const pct = percentualPorProfissional[id] ?? 0;
    acc[id].comissao = comissao(acc[id].totalCobrado, pct);
  }

  return acc;
}
