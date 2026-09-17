import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import {
  inicioDoDia,
  inicioDoDiaSeguinte,
  intervaloMes,
  parseDataParam,
  toDateParam,
} from "@/lib/datas";
import {
  comissaoPorProfissionalComServico,
  type AtendimentoInput,
  type ComissaoBase,
  type ConfigTaxa,
  type FormaPagamento,
  type RegraComissao,
} from "@/lib/financeiro";
import { valorAtingido, percentualAtingido, type MetaTipo } from "@/lib/metas";
import { brl } from "@/lib/format";
import Metas from "./Metas";

export const dynamic = "force-dynamic";

type OrdenarPor = "faturamento" | "comissao" | "atendimentos";

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

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; ordenar?: string }>;
}) {
  await exigirPapel(PAPEL_DONO);
  const { de: deParam, ate: ateParam, ordenar: ordenarParam } =
    await searchParams;

  const mes = intervaloMes(new Date());
  const deRanking = inicioDoDia(parseDataParam(deParam) ?? mes.de);
  const ateRanking = inicioDoDia(parseDataParam(ateParam) ?? mes.ate);
  const periodoRankingInvalido = deRanking.getTime() > ateRanking.getTime();
  const ordenar: OrdenarPor =
    ordenarParam === "comissao" || ordenarParam === "atendimentos"
      ? ordenarParam
      : "faturamento";

  const [profissionais, metasDb, config, taxasDb] = await Promise.all([
    prisma.profissional.findMany({
      include: { comissaoRegras: true },
      orderBy: { nome: "asc" },
    }),
    prisma.meta.findMany({
      orderBy: { criadoEm: "desc" },
      include: { profissional: { select: { nome: true } } },
    }),
    prisma.config.findUnique({ where: { id: "singleton" } }),
    prisma.taxaPagamento.findMany(),
  ]);

  const base: ComissaoBase =
    config?.comissaoBase === "LIQUIDO" ? "LIQUIDO" : "BRUTO";
  const taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>> = {};
  for (const t of taxasDb) {
    taxasPorForma[t.formaPagamento as FormaPagamento] = {
      percentual: t.percentual,
      valorFixo: t.valorFixo,
    };
  }
  const regrasPorProfissional: Record<string, RegraComissao[]> = {};
  for (const p of profissionais) {
    regrasPorProfissional[p.id] = p.comissaoRegras.map((r) => ({
      servicoId: r.servicoId,
      percentual: r.percentual,
    }));
  }

  // Progresso de cada meta — uma busca por meta, no próprio período dela.
  const metasComProgresso = await Promise.all(
    metasDb.map(async (m) => {
      const atendimentosDb = await prisma.agendamento.findMany({
        where: {
          status: "CONCLUIDO",
          valorCobrado: { not: null },
          inicio: { gte: m.periodoInicio, lt: inicioDoDiaSeguinte(m.periodoFim) },
          ...(m.profissionalId ? { profissionalId: m.profissionalId } : {}),
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
        tipo: m.tipo as MetaTipo,
        profissionalId: m.profissionalId,
      });
      return {
        id: m.id,
        tipo: m.tipo,
        profissionalNome: m.profissional?.nome ?? null,
        periodoInicio: toDateParam(m.periodoInicio),
        periodoFim: toDateParam(m.periodoFim),
        valorAlvo: m.valorAlvo,
        valorAtual,
        percentual: percentualAtingido(valorAtual, m.valorAlvo),
      };
    }),
  );

  // Ranking do período — todos os profissionais, período escolhido pelo dono.
  const rankingAtendimentosDb = periodoRankingInvalido
    ? []
    : await prisma.agendamento.findMany({
        where: {
          status: "CONCLUIDO",
          valorCobrado: { not: null },
          inicio: { gte: deRanking, lt: inicioDoDiaSeguinte(ateRanking) },
        },
        select: SELECT_ATENDIMENTO,
      });

  const agregadoRanking = comissaoPorProfissionalComServico(
    paraAtendimentoInput(rankingAtendimentosDb),
    regrasPorProfissional,
    base,
    taxasPorForma,
  );

  const METRICA: Record<OrdenarPor, (a: { qtd: number; totalCobrado: number; comissao: number }) => number> = {
    faturamento: (a) => a.totalCobrado,
    comissao: (a) => a.comissao,
    atendimentos: (a) => a.qtd,
  };

  const ranking = profissionais
    .filter((p) => p.ativo || agregadoRanking[p.id] !== undefined)
    .map((p) => {
      const a = agregadoRanking[p.id] ?? { qtd: 0, totalCobrado: 0, comissao: 0 };
      return { id: p.id, nome: p.nome, ativo: p.ativo, ...a };
    })
    .sort((a, b) => METRICA[ordenar](b) - METRICA[ordenar](a));

  return (
    <>
      <h1>Metas</h1>
      <p className="subtitle">Metas de faturamento e comissão por período</p>

      <Metas
        profissionais={profissionais.map((p) => ({ id: p.id, nome: p.nome }))}
        metas={metasComProgresso}
        periodoInicioDefault={toDateParam(mes.de)}
        periodoFimDefault={toDateParam(mes.ate)}
      />

      <h2 style={{ fontSize: 20, margin: "32px 0 4px" }}>Ranking do período</h2>
      <p className="subtitle">Comparativo entre profissionais</p>

      <div className="card">
        <form method="get" className="form-row" style={{ alignItems: "end" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="de">De</label>
            <input type="date" id="de" name="de" defaultValue={toDateParam(deRanking)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ate">Até</label>
            <input type="date" id="ate" name="ate" defaultValue={toDateParam(ateRanking)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ordenar">Ordenar por</label>
            <select id="ordenar" name="ordenar" defaultValue={ordenar}>
              <option value="faturamento">Faturamento</option>
              <option value="comissao">Comissão</option>
              <option value="atendimentos">Atendimentos</option>
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <button type="submit">Aplicar</button>
          </div>
        </form>
      </div>

      {periodoRankingInvalido ? (
        <div className="card">
          <div className="empty">
            A data inicial é posterior à data final. Ajuste o período para ver o ranking.
          </div>
        </div>
      ) : (
        <div className="card">
          {ranking.length === 0 ? (
            <div className="empty">Nenhum profissional cadastrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Profissional</th>
                  <th>Atendimentos</th>
                  <th>Faturamento</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}º</td>
                    <td>
                      {r.nome}
                      {!r.ativo && (
                        <span className="badge off" style={{ marginLeft: 8 }}>
                          inativo
                        </span>
                      )}
                    </td>
                    <td>{r.qtd}</td>
                    <td>{brl(r.totalCobrado)}</td>
                    <td>{brl(r.comissao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
