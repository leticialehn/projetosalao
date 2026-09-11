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
  resumoCaixaComTaxas,
  FORMAS_PAGAMENTO,
  type ConfigTaxa,
  type FormaPagamento,
  type PagamentoInput,
} from "@/lib/financeiro";
import FecharCaixa from "./FecharCaixa";

export const dynamic = "force-dynamic";

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

  const [pagamentos, qtdAtendimentos, fechamento, taxasDb] = await Promise.all([
    prisma.pagamento.findMany({
      where: { dataHora: { gte: de, lt: ate } },
      include: { agendamento: { include: { cliente: true, servico: true } } },
      orderBy: { dataHora: "asc" },
    }),
    prisma.agendamento.count({
      where: { status: "CONCLUIDO", inicio: { gte: de, lt: ate } },
    }),
    prisma.fechamentoCaixa.findUnique({ where: { data: de } }),
    prisma.taxaPagamento.findMany(),
  ]);

  const taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>> = {};
  for (const t of taxasDb) {
    taxasPorForma[t.formaPagamento as FormaPagamento] = {
      percentual: t.percentual,
      valorFixo: t.valorFixo,
    };
  }

  const resumo = resumoCaixaComTaxas(
    pagamentos as PagamentoInput[],
    qtdAtendimentos,
    taxasPorForma,
  );

  const fechado = fechamento !== null;
  const naoConferidos = pagamentos.filter((p) => !p.conferido).length;

  // Dia fechado → valores persistidos; dia aberto → recalculados agora.
  const totalBruto = fechamento?.totalGeral ?? resumo.totalBruto;
  const totalTaxas = fechamento?.totalTaxas ?? resumo.totalTaxas;
  const totalLiquido = fechamento?.totalLiquido ?? resumo.totalLiquido;
  const ticketMedio = fechamento?.ticketMedio ?? resumo.ticketMedio;
  const qtd = fechamento?.qtdAtendimentos ?? qtdAtendimentos;

  const brutoPorForma = (f: FormaPagamento) =>
    fechamento ? fechamento[TOTAL_SALVO[f]] : resumo.porForma[f].bruto;

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
          <div className="stat">{brl(totalBruto)}</div>
          <div className="stat-label">Total do dia (bruto)</div>
        </div>
        <div className="card">
          <div className="stat">{brl(totalLiquido)}</div>
          <div className="stat-label">Líquido (após taxas)</div>
        </div>
        <div className="card">
          <div className="stat">{brl(ticketMedio)}</div>
          <div className="stat-label">Ticket médio · {qtd} atend.</div>
        </div>
        <div className="card">
          <div className="stat">
            <span className={`badge ${fechado ? "CONCLUIDO" : "AGENDADO"}`}>
              {fechado ? "Fechado" : "Aberto"}
            </span>
          </div>
          <div className="stat-label">
            {brl(totalTaxas)} em taxas
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Total por forma</h2>
          {fechado && (
            <span className="muted">
              taxa/líquido por forma: estimados com as taxas atuais
            </span>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th>Bruto</th>
              <th>Taxa</th>
              <th>Líquido</th>
            </tr>
          </thead>
          <tbody>
            {FORMAS_PAGAMENTO.map((f) => (
              <tr key={f}>
                <td>{FORMA_PAGAMENTO_LABEL[f]}</td>
                <td>{brl(brutoPorForma(f))}</td>
                <td>{brl(resumo.porForma[f].taxa)}</td>
                <td>{brl(resumo.porForma[f].liquido)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{brl(totalBruto)}</strong>
              </td>
              <td>
                <strong>{brl(totalTaxas)}</strong>
              </td>
              <td>
                <strong>{brl(totalLiquido)}</strong>
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

            <p style={{ marginBottom: 4 }}>
              <strong>Bruto:</strong> {brl(fechamento.totalGeral)} ·{" "}
              <strong>Taxas:</strong> {brl(fechamento.totalTaxas)} ·{" "}
              <strong>Líquido:</strong> {brl(fechamento.totalLiquido)}
            </p>
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
              Serão gravados {brl(resumo.totalBruto)} bruto ·{" "}
              {brl(resumo.totalTaxas)} em taxas · {brl(resumo.totalLiquido)}{" "}
              líquido, em {pagamentos.length} pagamento(s) e {qtdAtendimentos}{" "}
              atendimento(s) concluído(s).
            </p>
            <FecharCaixa data={dataStr} fechado={false} />
          </>
        )}
      </div>
    </>
  );
}
