import { prisma } from "@/lib/prisma";
import { inicioDoDiaSeguinte } from "@/lib/datas";
import {
  comissaoPorProfissionalComServico,
  type AtendimentoInput,
  type ComissaoBase,
  type ConfigTaxa,
  type FormaPagamento,
  type RegraComissao,
} from "@/lib/financeiro";

export type LinhaServico = {
  servicoId: string;
  nome: string;
  qtd: number;
  totalCobrado: number;
  comissao: number;
};

export type Linha = {
  id: string;
  nome: string;
  ativo: boolean;
  qtd: number;
  totalCobrado: number;
  percentual: number;
  comissao: number;
  porServico: LinhaServico[];
};

/**
 * Busca os atendimentos concluídos no período `[de, ate]` e agrega a
 * comissão por profissional (e por serviço, quando houver regra
 * específica). Fonte única da agregação — usada tanto pela tela `/comissoes`
 * quanto pela exportação CSV (`/comissoes/export`), para nunca duplicar essa
 * lógica financeira entre os dois lugares.
 */
export async function buscarRelatorioComissoes(
  de: Date,
  ate: Date,
): Promise<{ linhas: Linha[]; base: ComissaoBase }> {
  const periodoInvalido = de.getTime() > ate.getTime();

  // `de > ate`: não busca/calcula atendimentos.
  const atendimentosPromise: Promise<
    {
      profissionalId: string;
      servicoId: string;
      valorCobrado: number | null;
      pagamentos: { valor: number; formaPagamento: string }[];
    }[]
  > = periodoInvalido
    ? Promise.resolve([])
    : prisma.agendamento.findMany({
        where: {
          status: "CONCLUIDO",
          valorCobrado: { not: null },
          // Fim inclusivo: tudo antes da meia-noite do dia seguinte a `ate`.
          inicio: { gte: de, lt: inicioDoDiaSeguinte(ate) },
        },
        select: {
          profissionalId: true,
          servicoId: true,
          valorCobrado: true,
          pagamentos: { select: { valor: true, formaPagamento: true } },
        },
      });

  // Inclui inativos: profissional desligado que atendeu no período ainda
  // tem comissão a receber (filtrados abaixo se não atenderam).
  const [atendimentosDb, profissionais, servicos, config, taxasDb] =
    await Promise.all([
      atendimentosPromise,
      prisma.profissional.findMany({
        include: { comissaoRegras: true },
        orderBy: { nome: "asc" },
      }),
      prisma.servico.findMany({ select: { id: true, nome: true } }),
      prisma.config.findUnique({ where: { id: "singleton" } }),
      prisma.taxaPagamento.findMany(),
    ]);

  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));

  const base: ComissaoBase =
    config?.comissaoBase === "LIQUIDO" ? "LIQUIDO" : "BRUTO";
  const taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>> = {};
  for (const t of taxasDb) {
    taxasPorForma[t.formaPagamento as FormaPagamento] = {
      percentual: t.percentual,
      valorFixo: t.valorFixo,
    };
  }

  const atendimentos: AtendimentoInput[] = atendimentosDb.map((a) => ({
    profissionalId: a.profissionalId,
    servicoId: a.servicoId,
    valorCobrado: a.valorCobrado ?? 0,
    pagamentos: a.pagamentos.map((p) => ({
      valor: p.valor,
      formaPagamento: p.formaPagamento as FormaPagamento,
    })),
  }));

  // Fonte canônica do percentual é a ComissaoRegra (não o espelho
  // `Profissional.comissaoPercentual`). Sem regra → 0.
  const regrasPorProfissional: Record<string, RegraComissao[]> = {};
  const percentualGeralPorProfissional: Record<string, number> = {};
  for (const p of profissionais) {
    regrasPorProfissional[p.id] = p.comissaoRegras.map((r) => ({
      servicoId: r.servicoId,
      percentual: r.percentual,
    }));
    percentualGeralPorProfissional[p.id] =
      p.comissaoRegras.find((r) => r.servicoId === null)?.percentual ?? 0;
  }

  const agregado = comissaoPorProfissionalComServico(
    atendimentos,
    regrasPorProfissional,
    base,
    taxasPorForma,
  );

  // A função pura não inventa profissionais: a linha com zeros para quem
  // não atendeu é montada aqui, a partir da lista de profissionais.
  const linhas: Linha[] = profissionais
    .filter((p) => p.ativo || agregado[p.id] !== undefined)
    .map((p) => {
      const a = agregado[p.id];
      // Quebra por serviço só aparece quando há regra específica (AC4) —
      // sem regra por serviço, o relatório fica idêntico ao Epic 1.
      const temRegraPorServico = p.comissaoRegras.some(
        (r) => r.servicoId !== null,
      );
      const porServico: LinhaServico[] = temRegraPorServico
        ? Object.entries(a?.porServico ?? {}).map(([servicoId, v]) => ({
            servicoId,
            nome: nomeServico.get(servicoId) ?? servicoId,
            qtd: v.qtd,
            totalCobrado: v.totalCobrado,
            comissao: v.comissao,
          }))
        : [];
      return {
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        qtd: a?.qtd ?? 0,
        totalCobrado: a?.totalCobrado ?? 0,
        percentual: percentualGeralPorProfissional[p.id] ?? 0,
        comissao: a?.comissao ?? 0,
        porServico,
      };
    });

  return { linhas, base };
}
