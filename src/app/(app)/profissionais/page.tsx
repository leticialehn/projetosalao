import { prisma } from "@/lib/prisma";
import { exigirPapel, PAPEL_DONO } from "@/lib/sessao";
import { criarProfissional } from "./actions";
import ProfissionalRow from "./ProfissionalRow";

export const dynamic = "force-dynamic";

export default async function ProfissionaisPage() {
  await exigirPapel(PAPEL_DONO);
  const profissionais = await prisma.profissional.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { comissaoRegra: { select: { percentual: true } } },
  });

  return (
    <>
      <h1>Profissionais</h1>
      <p className="subtitle">Equipe do salão</p>

      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo profissional</h2>
        <form action={criarProfissional}>
          <div className="form-row">
            <div className="field">
              <label>Nome</label>
              <input name="nome" placeholder="Nome completo" required />
            </div>
            <div className="field">
              <label>Especialidade</label>
              <input name="especialidade" placeholder="Ex.: Colorista" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Telefone</label>
              <input name="telefone" placeholder="(00) 00000-0000" />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit">Adicionar</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        {profissionais.length === 0 ? (
          <div className="empty">Nenhum profissional cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Especialidade</th>
                <th>Telefone</th>
                <th>Comissão</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {profissionais.map((p) => (
                <ProfissionalRow key={p.id} p={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
