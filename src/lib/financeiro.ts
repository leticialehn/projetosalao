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
  servicoId: string;
  pagamentos?: PagamentoInput[];
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

// --- Taxa de maquininha (Story 2.3) ---

export interface ConfigTaxa {
  percentual: number;
  valorFixo: number;
}

export const SEM_TAXA: ConfigTaxa = { percentual: 0, valorFixo: 0 };

/**
 * Taxa cobrada pela adquirente sobre um pagamento: `valor * % + fixo`,
 * arredondada para centavos. Nunca maior que o próprio valor (líquido não
 * fica negativo por configuração errada).
 */
export function taxaDePagamento(valor: number, t: ConfigTaxa): number {
  const bruta = reais((valor * t.percentual) / 100 + t.valorFixo);
  return Math.min(valor, Math.max(0, bruta));
}

/**
 * Como `resumoCaixa`, mas separando bruto / taxa / líquido por forma.
 * `resumoCaixa` continua existindo intacto (painel e comissão usam ele).
 * `ticketMedio` segue sobre o bruto.
 */
export function resumoCaixaComTaxas(
  pagamentos: PagamentoInput[],
  qtdAtendimentos: number,
  taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>>,
): {
  porForma: Record<
    FormaPagamento,
    { bruto: number; taxa: number; liquido: number }
  >;
  totalBruto: number;
  totalTaxas: number;
  totalLiquido: number;
  ticketMedio: number;
} {
  const porForma = {
    DINHEIRO: { bruto: 0, taxa: 0, liquido: 0 },
    PIX: { bruto: 0, taxa: 0, liquido: 0 },
    DEBITO: { bruto: 0, taxa: 0, liquido: 0 },
    CREDITO: { bruto: 0, taxa: 0, liquido: 0 },
  } as Record<FormaPagamento, { bruto: number; taxa: number; liquido: number }>;

  for (const p of pagamentos) {
    const t = taxasPorForma[p.formaPagamento] ?? SEM_TAXA;
    const taxa = taxaDePagamento(p.valor, t);
    const alvo = porForma[p.formaPagamento];
    alvo.bruto = reais(alvo.bruto + p.valor);
    alvo.taxa = reais(alvo.taxa + taxa);
    alvo.liquido = reais(alvo.liquido + (p.valor - taxa));
  }

  const totalBruto = somarPagamentos(pagamentos);
  const totalTaxas = reais(
    FORMAS_PAGAMENTO.reduce((s, f) => s + porForma[f].taxa, 0),
  );
  const totalLiquido = reais(totalBruto - totalTaxas);
  const ticketMedio =
    qtdAtendimentos > 0 ? reais(totalBruto / qtdAtendimentos) : 0;

  return { porForma, totalBruto, totalTaxas, totalLiquido, ticketMedio };
}

// --- Base da comissão: bruto ou líquido (Story 2.5) ---

export type ComissaoBase = "BRUTO" | "LIQUIDO";

/**
 * Valor-base sobre o qual a comissão de um atendimento incide. Em `BRUTO`
 * (ou sem `pagamentos` — legado/edge case), é sempre `valorCobrado`. Em
 * `LIQUIDO`, soma o líquido (`valor - taxaDePagamento`) de cada `Pagamento`
 * — cobre pagamento dividido entre formas, já que cada linha carrega sua
 * própria taxa.
 */
export function valorBaseComissao(
  atendimento: { valorCobrado: number; pagamentos?: PagamentoInput[] },
  base: ComissaoBase,
  taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>>,
): number {
  if (base === "BRUTO" || !atendimento.pagamentos) {
    return atendimento.valorCobrado;
  }
  return reais(
    atendimento.pagamentos.reduce((acc, p) => {
      const t = taxasPorForma[p.formaPagamento] ?? SEM_TAXA;
      return acc + (p.valor - taxaDePagamento(p.valor, t));
    }, 0),
  );
}

/** Comissão sobre um valor cobrado. Arredonda só o resultado final. */
export function comissao(valorCobrado: number, percentual: number): number {
  return reais((valorCobrado * percentual) / 100);
}

/** Uma regra de comissão: `servicoId` nulo = regra geral do profissional. */
export interface RegraComissao {
  servicoId: string | null;
  percentual: number;
}

/**
 * Resolve o percentual de comissão de um atendimento: regra do serviço se
 * existir, senão a regra geral (`servicoId` nulo), senão 0.
 */
export function percentualComissao(
  regras: RegraComissao[],
  servicoId: string,
): number {
  const doServico = regras.find((r) => r.servicoId === servicoId);
  if (doServico) return doServico.percentual;

  const geral = regras.find((r) => r.servicoId === null);
  return geral?.percentual ?? 0;
}

type AgregadoComissao = { qtd: number; totalCobrado: number; comissao: number };

/**
 * Agrega comissão por profissional (e, dentro de cada profissional, por
 * serviço) resolvendo o percentual de cada atendimento com `percentualComissao`.
 * `porServico` só existe para combinações efetivamente atendidas — a página
 * de relatório decide exibir a quebra só quando o profissional tiver alguma
 * regra específica por serviço.
 */
export function comissaoPorProfissionalComServico(
  atendimentos: AtendimentoInput[],
  regrasPorProfissional: Record<string, RegraComissao[]>,
  base: ComissaoBase = "BRUTO",
  taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>> = {},
): Record<
  string,
  AgregadoComissao & { porServico: Record<string, AgregadoComissao> }
> {
  const acc: Record<
    string,
    AgregadoComissao & { porServico: Record<string, AgregadoComissao> }
  > = {};

  for (const a of atendimentos) {
    const regras = regrasPorProfissional[a.profissionalId] ?? [];
    const pct = percentualComissao(regras, a.servicoId);
    const baseValor = valorBaseComissao(a, base, taxasPorForma);
    const com = comissao(baseValor, pct);

    const prof = acc[a.profissionalId] ?? {
      qtd: 0,
      totalCobrado: 0,
      comissao: 0,
      porServico: {},
    };
    prof.qtd += 1;
    prof.totalCobrado = reais(prof.totalCobrado + a.valorCobrado);
    prof.comissao = reais(prof.comissao + com);

    const servico = prof.porServico[a.servicoId] ?? {
      qtd: 0,
      totalCobrado: 0,
      comissao: 0,
    };
    servico.qtd += 1;
    servico.totalCobrado = reais(servico.totalCobrado + a.valorCobrado);
    servico.comissao = reais(servico.comissao + com);
    prof.porServico[a.servicoId] = servico;

    acc[a.profissionalId] = prof;
  }

  return acc;
}
