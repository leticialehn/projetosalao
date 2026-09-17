// Interpretação pura do agregado financeiro em função do tipo de meta.
// NÃO importa Prisma, next/* nem faz I/O — mesmo padrão de src/lib/estoque.ts.

export type MetaTipo = "FATURAMENTO" | "COMISSAO";

export function valorAtingido(
  agregado: Record<string, { totalCobrado: number; comissao: number }>,
  meta: { tipo: MetaTipo; profissionalId: string | null },
): number {
  if (meta.profissionalId) {
    const a = agregado[meta.profissionalId];
    if (!a) return 0;
    return meta.tipo === "COMISSAO" ? a.comissao : a.totalCobrado;
  }
  // Meta do salão: soma o faturamento de todos os profissionais.
  return Object.values(agregado).reduce((acc, a) => acc + a.totalCobrado, 0);
}

export function percentualAtingido(valorAtual: number, valorAlvo: number): number {
  if (valorAlvo <= 0) return 0;
  return Math.min(100, Math.round((valorAtual / valorAlvo) * 100));
}
