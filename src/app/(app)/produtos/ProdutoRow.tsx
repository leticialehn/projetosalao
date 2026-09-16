"use client";

import Link from "next/link";
import { useState } from "react";
import { atualizarProduto, excluirProduto } from "./actions";
import DeleteButton from "@/components/DeleteButton";
import { emAlerta } from "@/lib/estoque";

type Produto = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string | null;
  estoqueAtual: number;
  estoqueMinimo: number;
  ativo: boolean;
};

export default function ProdutoRow({
  produto,
  podeGerenciar = false,
}: {
  produto: Produto;
  podeGerenciar?: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (editando && podeGerenciar) {
    return (
      <tr>
        <td colSpan={7}>
          <form action={atualizarProduto}>
            <input type="hidden" name="id" value={produto.id} />
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input name="nome" defaultValue={produto.nome} required />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input name="categoria" defaultValue={produto.categoria ?? ""} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Unidade de medida</label>
                <input name="unidade" defaultValue={produto.unidade ?? ""} />
              </div>
              <div className="field">
                <label>Estoque mínimo</label>
                <input
                  name="estoqueMinimo"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={produto.estoqueMinimo}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={produto.ativo}
                  style={{ width: "auto", marginRight: 6 }}
                />
                Ativo
              </label>
            </div>
            <div className="row-actions">
              <button type="submit">Salvar</button>
              <button
                type="button"
                className="ghost"
                onClick={() => setEditando(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <Link href={`/produtos/${produto.id}`} style={{ fontWeight: 600 }}>
          {produto.nome}
        </Link>
      </td>
      <td>{produto.categoria ?? <span className="muted">—</span>}</td>
      <td>{produto.unidade ?? <span className="muted">—</span>}</td>
      <td>{produto.estoqueAtual}</td>
      <td>{produto.estoqueMinimo}</td>
      <td>
        <div className="row-actions">
          {produto.ativo ? (
            <span className="badge CONCLUIDO">Ativo</span>
          ) : (
            <span className="badge off">Inativo</span>
          )}
          {emAlerta(produto) && (
            <span className="badge CANCELADO">Estoque baixo</span>
          )}
        </div>
      </td>
      {podeGerenciar && (
        <td>
          <div className="row-actions">
            <button className="link" onClick={() => setEditando(true)}>
              Editar
            </button>
            <DeleteButton
              action={excluirProduto}
              id={produto.id}
              confirmMsg="Excluir este produto?"
            />
          </div>
        </td>
      )}
    </tr>
  );
}
