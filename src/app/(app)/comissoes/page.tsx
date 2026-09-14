import { Fragment } from "react";
import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { brl } from "@/lib/format";
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
  type RegraComissao,
} from "@/lib/financeiro";

export const dynamic = "force-dynamic";

type LinhaServico = {
  servicoId: string;
  nome: string;
  qtd: number;
  totalCobrado: number;
  comissao: number;
};

type Linha = {
  id: string;
  nome: string;
  ativo: boolean;
  qtd: number;
  totalCobrado: number;
  percentual: number;
  comissao: number;
  porServico: LinhaServico[];
};

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  await exigirPapel(PAPEL_DONO);
  const { de: deParam, ate: ateParam } = await searchParams;

  // Param ausente ou inválido cai para o mês corrente.
  const mes = intervaloMes(new Date());
  const de = inicioDoDia(parseDataParam(deParam) ?? mes.de);
  const ate = inicioDoDia(parseDataParam(ateParam) ?? mes.ate);

  const periodoInvalido = de.getTime() > ate.getTime();

  // `de > ate`: mostra aviso e não busca/calcula atendimentos.
  const atendimentosPromise: Promise<
    { profissionalId: string; servicoId: string; valorCobrado: number | null }[]
  > = periodoInvalido
    ? Promise.resolve([])
    : prisma.agendamento.findMany({
        where: {
          status: "CONCLUIDO",
          valorCobrado: { not: null },
          // Fim inclusivo: tudo antes da meia-noite do dia seguinte a `ate`.
          inicio: { gte: de, lt: inicioDoDiaSeguinte(ate) },
        },
        select: { profissionalId: true, servicoId: true, valorCobrado: true },
      });

  // Inclui inativos: profissional desligado que atendeu no período ainda
  // tem comissão a receber (filtrados abaixo se não atenderam).
  const [atendimentosDb, profissionais, servicos] = await Promise.all([
    atendimentosPromise,
    prisma.profissional.findMany({
      include: { comissaoRegras: true },
      orderBy: { nome: "asc" },
    }),
    prisma.servico.findMany({ select: { id: true, nome: true } }),
  ]);

  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));

  const atendimentos: AtendimentoInput[] = atendimentosDb.map((a) => ({
    profissionalId: a.profissionalId,
    servicoId: a.servicoId,
    valorCobrado: a.valorCobrado ?? 0,
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

  const totalComissoes = linhas.reduce((acc, l) => acc + l.comissao, 0);
  const totalCobrado = linhas.reduce((acc, l) => acc + l.totalCobrado, 0);
  const totalAtendimentos = linhas.reduce((acc, l) => acc + l.qtd, 0);

  return (
    <>
      <h1>Comissões</h1>
      <p className="subtitle">Comissão devida por profissional no período</p>

      <div className="card">
        <form method="get" className="form-row" style={{ alignItems: "end" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="de">De</label>
            <input
              type="date"
              id="de"
              name="de"
              defaultValue={toDateParam(de)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="ate">Até</label>
            <input
              type="date"
              id="ate"
              name="ate"
              defaultValue={toDateParam(ate)}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <button type="submit">Aplicar</button>
          </div>
        </form>
      </div>

      {periodoInvalido ? (
        <div className="card">
          <div className="empty">
            A data inicial é posterior à data final. Ajuste o período para ver
            as comissões.
          </div>
        </div>
      ) : (
        <>
          <div className="grid cols-3">
            <div className="card">
              <div className="stat">{brl(totalComissoes)}</div>
              <div className="stat-label">Total de comissões</div>
            </div>
            <div className="card">
              <div className="stat">{brl(totalCobrado)}</div>
              <div className="stat-label">Total cobrado</div>
            </div>
            <div className="card">
              <div className="stat">{totalAtendimentos}</div>
              <div className="stat-label">Atendimentos concluídos</div>
            </div>
          </div>

          <div className="card">
            {linhas.length === 0 ? (
              <div className="empty">Nenhum profissional cadastrado.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th>Atendimentos</th>
                    <th>Total cobrado</th>
                    <th>%</th>
                    <th>Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <Fragment key={l.id}>
                      <tr>
                        <td>
                          {l.nome}
                          {!l.ativo && (
                            <span className="badge off" style={{ marginLeft: 8 }}>
                              inativo
                            </span>
                          )}
                        </td>
                        <td>{l.qtd}</td>
                        <td>{brl(l.totalCobrado)}</td>
                        <td>{l.percentual}%</td>
                        <td>{brl(l.comissao)}</td>
                      </tr>
                      {l.porServico.map((s) => (
                        <tr key={`${l.id}-${s.servicoId}`} className="muted">
                          <td style={{ paddingLeft: 24 }}>— {s.nome}</td>
                          <td>{s.qtd}</td>
                          <td>{brl(s.totalCobrado)}</td>
                          <td></td>
                          <td>{brl(s.comissao)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr>
                    <td>
                      <strong>Total</strong>
                    </td>
                    <td>
                      <strong>{totalAtendimentos}</strong>
                    </td>
                    <td>
                      <strong>{brl(totalCobrado)}</strong>
                    </td>
                    <td></td>
                    <td>
                      <strong>{brl(totalComissoes)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
