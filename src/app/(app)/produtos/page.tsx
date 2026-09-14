import { prisma } from "@/lib/prisma";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";
import { criarProduto } from "./actions";
import ProdutoRow from "./ProdutoRow";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const sessao = await exigirSessao();
  const podeGerenciar = sessao.papel === PAPEL_DONO;

  const produtos = await prisma.produto.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });

  return (
    <>
      <h1>Produtos</h1>
      <p className="subtitle">Cadastro de produtos e estoque mínimo</p>

      {podeGerenciar && (
        <div className="card">
          <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo produto</h2>
          <form action={criarProduto}>
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input name="nome" placeholder="Ex.: Shampoo 1L" required />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input name="categoria" placeholder="Ex.: Revenda" />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Unidade de medida</label>
                <input name="unidade" placeholder="Ex.: un, ml, g" />
              </div>
              <div className="field">
                <label>Estoque mínimo</label>
                <input
                  name="estoqueMinimo"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={0}
                  required
                />
              </div>
            </div>
            <div className="row-actions">
              <button type="submit">Adicionar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {produtos.length === 0 ? (
          <div className="empty">Nenhum produto cadastrado.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Unidade</th>
                <th>Estoque atual</th>
                <th>Estoque mínimo</th>
                <th>Situação</th>
                {podeGerenciar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <ProdutoRow key={p.id} produto={p} podeGerenciar={podeGerenciar} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
