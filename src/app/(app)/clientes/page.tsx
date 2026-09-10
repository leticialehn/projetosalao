import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";
import { criarCliente } from "./actions";
import ClienteRow from "./ClienteRow";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sessao = await exigirSessao();
  const podeExcluir = sessao.papel === PAPEL_DONO;
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? { OR: [{ nome: { contains: busca } }, { telefone: { contains: busca } }] }
      : undefined,
    orderBy: { nome: "asc" },
    include: { _count: { select: { agendamentos: true } } },
  });

  return (
    <>
      <h1>Clientes</h1>
      <p className="subtitle">Cadastro de clientes</p>

      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo cliente</h2>
        <form action={criarCliente}>
          <div className="form-row">
            <div className="field">
              <label>Nome</label>
              <input name="nome" placeholder="Nome completo" required />
            </div>
            <div className="field">
              <label>Telefone</label>
              <input name="telefone" placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>E-mail</label>
              <input name="email" type="email" placeholder="email@exemplo.com" />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit">Adicionar</button>
            </div>
          </div>
          <div className="field">
            <label>Observações</label>
            <textarea name="observacoes" rows={2} placeholder="Preferências, alergias, etc." />
          </div>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <form method="get" className="row-actions" style={{ flex: 1 }}>
            <input
              name="q"
              defaultValue={busca}
              placeholder="Buscar por nome ou telefone"
              aria-label="Buscar cliente"
              style={{ maxWidth: 320 }}
            />
            <button type="submit">Buscar</button>
            {busca && (
              <Link href="/clientes" className="btn ghost">
                Limpar
              </Link>
            )}
          </form>
        </div>

        {clientes.length === 0 ? (
          <div className="empty">
            {busca
              ? `Nenhum cliente encontrado para "${busca}".`
              : "Nenhum cliente cadastrado."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Agend.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <ClienteRow key={c.id} c={c} podeExcluir={podeExcluir} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
