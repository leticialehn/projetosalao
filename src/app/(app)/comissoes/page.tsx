import { Fragment } from "react";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { brl } from "@/lib/format";
import {
  inicioDoDia,
  intervaloMes,
  parseDataParam,
  periodoAnterior,
  toDateParam,
} from "@/lib/datas";
import { buscarRelatorioComissoes } from "./relatorio";
import { variacaoPct, formatarVariacao } from "./variacao";

export const dynamic = "force-dynamic";

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

  const { linhas, base } = await buscarRelatorioComissoes(de, ate);
  const anterior = periodoAnterior(de, ate);
  const { linhas: linhasAnterior } = await buscarRelatorioComissoes(
    anterior.de,
    anterior.ate,
  );

  const totalComissoes = linhas.reduce((acc, l) => acc + l.comissao, 0);
  const totalCobrado = linhas.reduce((acc, l) => acc + l.totalCobrado, 0);
  const totalAtendimentos = linhas.reduce((acc, l) => acc + l.qtd, 0);

  const totalComissoesAnterior = linhasAnterior.reduce(
    (acc, l) => acc + l.comissao,
    0,
  );
  const totalCobradoAnterior = linhasAnterior.reduce(
    (acc, l) => acc + l.totalCobrado,
    0,
  );
  const totalAtendimentosAnterior = linhasAnterior.reduce(
    (acc, l) => acc + l.qtd,
    0,
  );

  return (
    <>
      <h1>Comissões</h1>
      <p className="subtitle">Comissão devida por profissional no período</p>
      <p className="subtitle">
        Comissão calculada sobre: {base === "LIQUIDO" ? "Líquido" : "Bruto"}
      </p>

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
        <p className="subtitle" style={{ marginBottom: 0 }}>
          <a
            href={`/comissoes/export?de=${toDateParam(de)}&ate=${toDateParam(ate)}`}
          >
            Exportar CSV
          </a>
        </p>
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
              <div className="subtitle">
                vs. período anterior:{" "}
                {formatarVariacao(
                  variacaoPct(totalComissoes, totalComissoesAnterior),
                )}
              </div>
            </div>
            <div className="card">
              <div className="stat">{brl(totalCobrado)}</div>
              <div className="stat-label">Total cobrado</div>
              <div className="subtitle">
                vs. período anterior:{" "}
                {formatarVariacao(
                  variacaoPct(totalCobrado, totalCobradoAnterior),
                )}
              </div>
            </div>
            <div className="card">
              <div className="stat">{totalAtendimentos}</div>
              <div className="stat-label">Atendimentos concluídos</div>
              <div className="subtitle">
                vs. período anterior:{" "}
                {formatarVariacao(
                  variacaoPct(totalAtendimentos, totalAtendimentosAnterior),
                )}
              </div>
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
