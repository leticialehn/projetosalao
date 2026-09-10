import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";
import { brl, hora, dia as diaExtenso, FORMA_PAGAMENTO_LABEL } from "@/lib/format";
import {
  inicioDoDia,
  inicioDoDiaSeguinte,
  parseDataParam,
  toDateParam,
} from "@/lib/datas";
import {
  resumoCaixa,
  FORMAS_PAGAMENTO,
  type FormaPagamento,
  type PagamentoInput,
} from "@/lib/financeiro";
import FecharCaixa from "./FecharCaixa";

export const dynamic = "force-dynamic";

/** Valor salvo no fechamento correspondente a cada forma de pagamento. */
const TOTAL_SALVO: Record<
  FormaPagamento,
  "totalDinheiro" | "totalPix" | "totalDebito" | "totalCredito"
> = {
  DINHEIRO: "totalDinheiro",
  PIX: "totalPix",
  DEBITO: "totalDebito",
  CREDITO: "totalCredito",
};

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const sessao = await exigirSessao();
  const podeReabrir = sessao.papel === PAPEL_DONO;
  const { data: dataParam } = await searchParams;
  const referencia = parseDataParam(dataParam) ?? new Date();
  const de = inicioDoDia(referencia);
  const ate = inicioDoDiaSeguinte(referencia);
  const dataStr = toDateParam(de);

  const [pagamentos, qtdAtendimentos, fechamento] = await Promise.all([
    prisma.pagamento.findMany({
      where: { dataHora: { gte: de, lt: ate } },
      include: { agendamento: { include: { cliente: true, servico: true } } },
      orderBy: { dataHora: "asc" },
    }),
    prisma.agendamento.count({
      where: { status: "CONCLUIDO", inicio: { gte: de, lt: ate } },
    }),
    prisma.fechamentoCaixa.findUnique({ where: { data: de } }),
  ]);

  const { porForma, totalGeral, ticketMedio } = resumoCaixa(
    pagamentos as PagamentoInput[],
    qtdAtendimentos,
  );

  const fechado = fechamento !== null;
  const naoConferidos = pagamentos.filter((p) => !p.conferido).length;

  // Em dia fechado exibimos os valores persistidos (somente leitura);
  // em dia aberto, os valores recalculados agora.
  const exibido = fechamento
    ? {
        porForma: {
          DINHEIRO: fechamento.totalDinheiro,
          PIX: fechamento.totalPix,
          DEBITO: fechamento.totalDebito,
          CREDITO: fechamento.totalCredito,
        } as Record<FormaPagamento, number>,
        totalGeral: fechamento.totalGeral,
        ticketMedio: fechamento.ticketMedio,
        qtdAtendimentos: fechamento.qtdAtendimentos,
      }
    : { porForma, totalGeral, ticketMedio, qtdAtendimentos };

  return (
    <>
      <h1>Caixa</h1>
      <p className="subtitle" style={{ textTransform: "capitalize" }}>
        {diaExtenso(de)}
      </p>

      <div className="card">
        <form method="get" action="/caixa" className="section-head">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="data">Dia</label>
            <input type="date" id="data" name="data" defaultValue={dataStr} />
          </div>
          <div className="row-actions">
            <button type="submit">Ver</button>
            <Link className="btn ghost" href="/caixa">
              Hoje
            </Link>
          </div>
        </form>
      </div>

      <div className="grid cols-4">
        <div className="card">
          <div className="stat">{brl(exibido.totalGeral)}</div>
          <div className="stat-label">Total do dia</div>
        </div>
        <div className="card">
          <div className="stat">{exibido.qtdAtendimentos}</div>
          <div className="stat-label">Atendimentos concluídos</div>
        </div>
        <div className="card">
          <div className="stat">{brl(exibido.ticketMedio)}</div>
          <div className="stat-label">Ticket médio</div>
        </div>
        <div className="card">
          <div className="stat">
            <span className={`badge ${fechado ? "CONCLUIDO" : "AGENDADO"}`}>
              {fechado ? "Fechado" : "Aberto"}
            </span>
          </div>
          <div className="stat-label">Status do caixa</div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Total por forma</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {FORMAS_PAGAMENTO.map((f) => (
              <tr key={f}>
                <td>{FORMA_PAGAMENTO_LABEL[f]}</td>
                <td>{brl(exibido.porForma[f])}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total geral</strong>
              </td>
              <td>
                <strong>{brl(exibido.totalGeral)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Pagamentos do dia</h2>
          <span className="muted">{pagamentos.length} lançamento(s)</span>
        </div>
        {pagamentos.length === 0 ? (
          <div className="empty">Nenhum pagamento registrado neste dia.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Forma</th>
                <th>Valor</th>
                <th>Conferido</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id}>
                  <td>{hora(p.dataHora)}</td>
                  <td>{p.agendamento.cliente.nome}</td>
                  <td>{p.agendamento.servico.nome}</td>
                  <td>{FORMA_PAGAMENTO_LABEL[p.formaPagamento]}</td>
                  <td>{brl(p.valor)}</td>
                  <td>
                    <span className={`badge ${p.conferido ? "CONCLUIDO" : "off"}`}>
                      {p.conferido ? "Sim" : "Não"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        {fechamento ? (
          <>
            <div className="section-head">
              <h2 style={{ margin: 0, fontSize: 18 }}>Caixa fechado</h2>
              <span className="muted">
                Valores salvos no fechamento — somente leitura
              </span>
            </div>

            <div className="grid cols-4">
              {FORMAS_PAGAMENTO.map((f) => (
                <div key={f}>
                  <div className="stat" style={{ fontSize: 20 }}>
                    {brl(fechamento[TOTAL_SALVO[f]])}
                  </div>
                  <div className="stat-label">{FORMA_PAGAMENTO_LABEL[f]}</div>
                </div>
              ))}
            </div>

            <p style={{ marginBottom: 4 }}>
              <strong>Observações:</strong>{" "}
              {fechamento.observacoes ? (
                fechamento.observacoes
              ) : (
                <span className="muted">nenhuma</span>
              )}
            </p>

            {naoConferidos > 0 && (
              <p style={{ color: "var(--danger)" }}>
                Há {naoConferidos} pagamento(s) não conferido(s) neste dia —
                reabra o caixa para incluí-los.
              </p>
            )}

            <FecharCaixa data={dataStr} fechado podeReabrir={podeReabrir} />
          </>
        ) : (
          <>
            <div className="section-head">
              <h2 style={{ margin: 0, fontSize: 18 }}>Fechar caixa</h2>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Serão gravados {brl(totalGeral)} em {pagamentos.length}{" "}
              pagamento(s) e {qtdAtendimentos} atendimento(s) concluído(s).
            </p>
            <FecharCaixa data={dataStr} fechado={false} />
          </>
        )}
      </div>
    </>
  );
}
