import { prisma } from "@/lib/prisma";
import { brl, dataHora, hora, STATUS_LABEL } from "@/lib/format";
import { excluirAgendamento } from "./actions";
import NovoAgendamento from "./NovoAgendamento";
import AgendaAcoes from "../AgendaAcoes";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: string;
    inicio?: string;
    profissionalId?: string;
    clienteId?: string;
  }>;
}) {
  const {
    filtro = "proximos",
    inicio,
    profissionalId,
    clienteId,
  } = await searchParams;
  const agora = new Date();

  const where =
    filtro === "todos"
      ? {}
      : filtro === "passados"
        ? { inicio: { lt: agora } }
        : { inicio: { gte: agora } };

  const [agendamentos, clientes, profissionais, servicos] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      include: { cliente: true, profissional: true, servico: true },
      orderBy: { inicio: filtro === "passados" ? "desc" : "asc" },
    }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.profissional.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  const filtros = [
    { key: "proximos", label: "Próximos" },
    { key: "passados", label: "Passados" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <>
      <h1>Agendamentos</h1>
      <p className="subtitle">Agenda do salão</p>

      <NovoAgendamento
        clientes={clientes}
        profissionais={profissionais}
        servicos={servicos}
        inicial={{
          inicio: inicio ?? null,
          profissionalId: profissionalId ?? null,
          clienteId: clienteId ?? null,
        }}
      />

      <div className="card">
        <div className="section-head">
          <div className="row-actions">
            {filtros.map((f) => (
              <a
                key={f.key}
                href={`/agendamentos?filtro=${f.key}`}
                className={`btn ${filtro === f.key ? "" : "ghost"}`}
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>

        {agendamentos.length === 0 ? (
          <div className="empty">Nenhum agendamento.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Profissional</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((a) => (
                <tr key={a.id}>
                  <td>
                    {dataHora(a.inicio)}
                    <div className="muted" style={{ fontSize: 12 }}>
                      até {hora(a.fim)}
                    </div>
                  </td>
                  <td>{a.cliente.nome}</td>
                  <td>{a.servico.nome}</td>
                  <td>{a.profissional.nome}</td>
                  <td>{brl(a.valorCobrado ?? a.servico.preco)}</td>
                  <td>
                    <span className={`badge ${a.status}`}>
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <AgendaAcoes
                        id={a.id}
                        status={a.status}
                        inicio={a.inicio.toISOString()}
                        profissionalId={a.profissionalId}
                        servicoNome={a.servico.nome}
                        servicoPreco={a.servico.preco}
                        clienteNome={a.cliente.nome}
                        profissionais={profissionais.map((p) => ({
                          id: p.id,
                          nome: p.nome,
                        }))}
                      />
                      <DeleteButton
                        action={excluirAgendamento}
                        id={a.id}
                        confirmMsg="Excluir este agendamento?"
                      />
                    </div>
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
