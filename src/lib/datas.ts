// Funções puras de data. Assume um único fuso horário: o do servidor/salão.
// Não há conversão de timezone — todas as operações usam a hora local do processo.

/** Meia-noite (00:00:00.000) do dia de `d`, hora local. */
export function inicioDoDia(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Último instante do dia de `d` (23:59:59.999), hora local. */
export function fimDoDia(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/** Meia-noite do dia seguinte ao de `d`. Use com `< ` em queries de intervalo. */
export function inicioDoDiaSeguinte(d: Date): Date {
  const r = inicioDoDia(d);
  r.setDate(r.getDate() + 1);
  return r;
}

/** Intervalo [de, ate] cobrindo o mês inteiro da data de referência. */
export function intervaloMes(ref: Date): { de: Date; ate: Date } {
  const de = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const ate = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { de, ate };
}

/**
 * Converte `YYYY-MM-DD` em um `Date` na meia-noite local.
 * Retorna `null` para entrada vazia ou inválida.
 */
export function parseDataParam(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
  if (
    d.getFullYear() !== ano ||
    d.getMonth() !== mes - 1 ||
    d.getDate() !== dia
  ) {
    return null;
  }
  return d;
}

/** Segunda-feira 00:00 da semana que contém `d` (semana começa na segunda). */
export function inicioDaSemana(d: Date): Date {
  const r = inicioDoDia(d);
  const diaSemana = r.getDay(); // 0 = domingo
  const ajuste = diaSemana === 0 ? -6 : 1 - diaSemana;
  r.setDate(r.getDate() + ajuste);
  return r;
}

/** Segunda-feira 00:00 da semana seguinte. Use com `< ` em queries. */
export function inicioDaSemanaSeguinte(d: Date): Date {
  const r = inicioDaSemana(d);
  r.setDate(r.getDate() + 7);
  return r;
}

/** Formata um `Date` como `YYYY-MM-DD`, hora local. */
export function toDateParam(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Formata um `Date` como data + hora curta em pt-BR (ex.: "20/09/2026 14:30"). */
export function formatarDataHora(d: Date): string {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
