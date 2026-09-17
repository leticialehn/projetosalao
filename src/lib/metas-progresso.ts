// Cálculo de progresso de metas, com Prisma injetado por parâmetro (mesmo
// padrão de `temConflito` em src/lib/agenda.ts) — testável sem vi.mock.
import type { PrismaClient } from "@prisma/client";
import { inicioDoDia, inicioDoDiaSeguinte } from "./datas";
import {
  comissaoPorProfissionalComServico,
  type AtendimentoInput,
  type ComissaoBase,
  type ConfigTaxa,
  type FormaPagamento,
  type RegraComissao,
} from "./financeiro";
import { valorAtingido, percentualAtingido, type MetaTipo } from "./metas";

const SELECT_ATENDIMENTO = {
  profissionalId: true,
  servicoId: true,
  valorCobrado: true,
  pagamentos: { select: { valor: true, formaPagamento: true } },
} as const;

type AtendimentoDb = {
  profissionalId: string;
  servicoId: string;
  valorCobrado: number | null;
  pagamentos: { valor: number; formaPagamento: string }[];
};

function paraAtendimentoInput(rows: AtendimentoDb[]): AtendimentoInput[] {
  return rows.map((a) => ({
    profissionalId: a.profissionalId,
    servicoId: a.servicoId,
    valorCobrado: a.valorCobrado ?? 0,
    pagamentos: a.pagamentos.map((p) => ({
      valor: p.valor,
      formaPagamento: p.formaPagamento as FormaPagamento,
    })),
  }));
}

export type MetaBasica = {
  profissionalId: string | null;
  tipo: string;
  periodoInicio: Date;
  periodoFim: Date;
  valorAlvo: number;
};

export async function progressoDaMeta(
  db: Pick<PrismaClient, "agendamento">,
  meta: MetaBasica,
  regrasPorProfissional: Record<string, RegraComissao[]>,
  base: ComissaoBase,
  taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>>,
): Promise<{ valorAtual: number; percentual: number }> {
  const atendimentosDb = await db.agendamento.findMany({
    where: {
      status: "CONCLUIDO",
      valorCobrado: { not: null },
      inicio: { gte: meta.periodoInicio, lt: inicioDoDiaSeguinte(meta.periodoFim) },
      ...(meta.profissionalId ? { profissionalId: meta.profissionalId } : {}),
    },
    select: SELECT_ATENDIMENTO,
  });
  const agregado = comissaoPorProfissionalComServico(
    paraAtendimentoInput(atendimentosDb),
    regrasPorProfissional,
    base,
    taxasPorForma,
  );
  const valorAtual = valorAtingido(agregado, {
    tipo: meta.tipo as MetaTipo,
    profissionalId: meta.profissionalId,
  });
  return { valorAtual, percentual: percentualAtingido(valorAtual, meta.valorAlvo) };
}

export type MetaAtivaHoje = {
  id: string;
  tipo: string;
  profissionalId: string | null;
  profissionalNome: string | null;
  periodoInicio: Date;
  periodoFim: Date;
  valorAlvo: number;
};

/**
 * Metas cujo período inclui `hoje`. Compara `periodoFim` com `inicioDoDia(hoje)`
 * (não `hoje` bruto) porque `periodoFim` é gravado como meia-noite do último
 * dia do período — comparar com a hora exata do request excluiria o próprio
 * último dia incorretamente (ver Story 7.1, Dev Notes).
 */
export async function metasAtivasHoje(
  db: Pick<PrismaClient, "meta">,
  hoje: Date,
): Promise<MetaAtivaHoje[]> {
  const hojeMeiaNoite = inicioDoDia(hoje);
  const metas = await db.meta.findMany({
    where: { periodoInicio: { lte: hoje }, periodoFim: { gte: hojeMeiaNoite } },
    include: { profissional: { select: { nome: true } } },
  });
  return metas.map((m) => ({
    id: m.id,
    tipo: m.tipo,
    profissionalId: m.profissionalId,
    profissionalNome: m.profissional?.nome ?? null,
    periodoInicio: m.periodoInicio,
    periodoFim: m.periodoFim,
    valorAlvo: m.valorAlvo,
  }));
}
