import { prisma } from "@/lib/prisma";
import { brl, hora } from "@/lib/format";
import { inicioDoDia, inicioDoDiaSeguinte } from "@/lib/datas";
import { resumoCaixa, type PagamentoInput } from "@/lib/financeiro";
import { exigirPapel, PAPEL_DONO, PAPEL_BALCAO } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  await exigirPapel(PAPEL_DONO, PAPEL_BALCAO);
  const agora = new Date();
  const de = inicioDoDia(agora);
  const ate = inicioDoDiaSeguinte(agora);

  const [pagamentos, agendamentos] = await Promise.all([
    prisma.pagamento.findMany({ where: { dataHora: { gte: de, lt: ate } } }),
    prisma.agendamento.findMany({
      where: { inicio: { gte: de, lt: ate } },
      include: { cliente: true, servico: true, profissional: true },
      orderBy: { inicio: "asc" },
    }),
  ]);

  const concluidos = agendamentos.filter((a) => a.status === "CONCLUIDO");
  const pendentes = agendamentos.filter((a) => a.status === "AGENDADO");
  const proximos = pendentes.filter((a) => a.inicio >= agora);

  const { totalGeral, ticketMedio } = resumoCaixa(
    pagamentos as PagamentoInput[],
    concluidos.length,
  );

  const vazio = agendamentos.length === 0 && pagamentos.length === 0;

  return (
    <>
      <h1>Painel do dia</h1>
      <p className="subtitle">Resultado de hoje em tempo real</p>

      {vazio ? (
        <div className="card">
          <div className="empty">Nenhum movimento registrado hoje.</div>
        </div>
      ) : (
        <>
          <div className="grid cols-4">
            <div className="card">
              <div className="stat">{brl(totalGeral)}</div>
              <div className="stat-label">Receita hoje</div>
            </div>
            <div className="card">
              <div className="stat">{concluidos.length}</div>
              <div className="stat-label">Atendimentos concluídos</div>
            </div>
            <div className="card">
              <div className="stat">{brl(ticketMedio)}</div>
              <div className="stat-label">Ticket médio</div>
            </div>
            <div className="card">
              <div className="stat">{pendentes.length}</div>
              <div className="stat-label">Pendentes hoje</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Próximos horários</h2>
            {proximos.length === 0 ? (
              <div className="empty">Nenhum horário pendente hoje.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Serviço</th>
                    <th>Profissional</th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map((a) => (
                    <tr key={a.id}>
                      <td>{hora(a.inicio)}</td>
                      <td>{a.cliente.nome}</td>
                      <td>{a.servico.nome}</td>
                      <td>{a.profissional.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
