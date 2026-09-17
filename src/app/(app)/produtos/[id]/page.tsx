import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { exigirPapel, PAPEL_DONO, PAPEL_BALCAO } from "@/lib/sessao";
import FormMovimento from "./FormMovimento";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<string, string> = { ENTRADA: "Entrada", SAIDA: "Saída" };

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessao = await exigirPapel(PAPEL_DONO, PAPEL_BALCAO);

  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { movimentos: { orderBy: { data: "desc" } } },
  });

  if (!produto) notFound();

  return (
    <>
      <h1>{produto.nome}</h1>
      <p className="subtitle">Ficha do produto</p>

      <div className="card">
        <div className="section-head">
          <div className="row-actions">
            <Link href="/produtos" className="btn ghost">
              ← Produtos
            </Link>
          </div>
        </div>

        <div className="grid cols-4">
          <div>
            <div className="stat-label">Categoria</div>
            <div>{produto.categoria ?? <span className="muted">—</span>}</div>
          </div>
          <div>
            <div className="stat-label">Unidade</div>
            <div>{produto.unidade ?? <span className="muted">—</span>}</div>
          </div>
          <div>
            <div className="stat-label">Estoque atual</div>
            <div className="stat">{produto.estoqueAtual}</div>
          </div>
          <div>
            <div className="stat-label">Estoque mínimo</div>
            <div className="stat">{produto.estoqueMinimo}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Registrar movimentação</h2>
        <FormMovimento
          produtoId={produto.id}
          podeRegistrarEntrada={sessao.papel === PAPEL_DONO}
        />
      </div>

      <div className="card">
        <div className="section-head">
          <h2 style={{ margin: 0, fontSize: 18 }}>Histórico</h2>
        </div>

        {produto.movimentos.length === 0 ? (
          <div className="empty">Nenhuma movimentação registrada.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {produto.movimentos.map((m) => (
                <tr key={m.id}>
                  <td>{dataHora(m.data)}</td>
                  <td>
                    <span className={`badge ${m.tipo === "ENTRADA" ? "CONCLUIDO" : "off"}`}>
                      {TIPO_LABEL[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  <td>{m.quantidade}</td>
                  <td>{m.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
