/**
 * Variação percentual entre o valor atual e o anterior. `null` quando o
 * anterior é zero (divisão por zero) — a tela mostra "—" nesse caso (AC 6).
 */
export function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

export function formatarVariacao(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}
