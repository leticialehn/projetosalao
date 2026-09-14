import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { criarServico } from "./actions";
import ServicoRow from "./ServicoRow";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  await exigirPapel(PAPEL_DONO);
  const servicos = await prisma.servico.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <>
      <h1>Serviços</h1>
      <p className="subtitle">Catálogo de serviços oferecidos</p>

      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo serviço</h2>
        <form action={criarServico}>
          <div className="form-row">
            <div className="field">
              <label>Nome</label>
              <input name="nome" placeholder="Ex.: Corte masculino" required />
            </div>
            <div className="field">
              <label>Duração (min)</label>
              <input name="duracaoMin" type="number" min={1} defaultValue={30} required />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Preço (R$)</label>
              <input name="preco" type="number" step="0.01" min={0} defaultValue={0} required />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit">Adicionar</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        {servicos.length === 0 ? (
          <div className="empty">Nenhum serviço cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Duração</th>
                <th>Preço</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <ServicoRow key={s.id} servico={s} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
