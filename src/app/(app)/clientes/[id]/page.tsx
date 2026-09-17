import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brl, dataHora, STATUS_LABEL } from "@/lib/format";
import Observacoes from "./Observacoes";
import { exigirPapel, PAPEL_DONO, PAPEL_BALCAO } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirPapel(PAPEL_DONO, PAPEL_BALCAO);
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      agendamentos: {
        include: { servico: true, profissional: true },
        orderBy: { inicio: "desc" },
      },
    },
  });

  if (!cliente) notFound();

  const ultimaVisita = cliente.agendamentos.find((a) => a.status === "CONCLUIDO");

  return (
    <>
      <h1>{cliente.nome}</h1>
      <p className="subtitle">Ficha do cliente</p>

      <div className="card">
        <div className="section-head">
          <div className="row-actions">
            <Link href="/clientes" className="btn ghost">
              ← Clientes
            </Link>
          </div>
          <div className="row-actions">
            <Link href={`/agendamentos?clienteId=${cliente.id}`} className="btn">
              Novo agendamento
            </Link>
          </div>
        </div>

        <div className="grid cols-3">
          <div>
            <div className="stat-label">Telefone</div>
            <div>{cliente.telefone ?? <span className="muted">—</span>}</div>
          </div>
          <div>
            <div className="stat-label">E-mail</div>
            <div>{cliente.email ?? <span className="muted">—</span>}</div>
          </div>
          <div>
            <div className="stat-label">Última visita</div>
            <div>
              {ultimaVisita ? (
                dataHora(ultimaVisita.inicio)
              ) : (
                <span className="muted">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <Observacoes id={cliente.id} observacoes={cliente.observacoes} />
      </div>

      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Histórico</h2>
        </div>

        {cliente.agendamentos.length === 0 ? (
          <div className="empty">Nenhum atendimento registrado</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Serviço</th>
                <th>Profissional</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cliente.agendamentos.map((a) => (
                <tr key={a.id}>
                  <td>{dataHora(a.inicio)}</td>
                  <td>{a.servico.nome}</td>
                  <td>{a.profissional.nome}</td>
                  <td>
                    {a.valorCobrado == null ? (
                      <span className="muted">—</span>
                    ) : (
                      brl(a.valorCobrado)
                    )}
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
