"use client";

import { useState } from "react";
import { brl } from "@/lib/format";
import { atualizarServico, excluirServico } from "./actions";
import DeleteButton from "@/components/DeleteButton";

type Servico = {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  ativo: boolean;
};

export default function ServicoRow({ servico }: { servico: Servico }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <tr>
        <td colSpan={5}>
          <form action={atualizarServico}>
            <input type="hidden" name="id" value={servico.id} />
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input name="nome" defaultValue={servico.nome} required />
              </div>
              <div className="field">
                <label>Duração (min)</label>
                <input
                  name="duracaoMin"
                  type="number"
                  min={1}
                  defaultValue={servico.duracaoMin}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Preço (R$)</label>
                <input
                  name="preco"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={servico.preco}
                  required
                />
              </div>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    name="ativo"
                    defaultChecked={servico.ativo}
                    style={{ width: "auto", marginRight: 6 }}
                  />
                  Ativo
                </label>
              </div>
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
      <td>{servico.nome}</td>
      <td>{servico.duracaoMin} min</td>
      <td>{brl(servico.preco)}</td>
      <td>
        {servico.ativo ? (
          <span className="badge CONCLUIDO">Ativo</span>
        ) : (
          <span className="badge off">Inativo</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          <button className="link" onClick={() => setEditando(true)}>
            Editar
          </button>
          <DeleteButton
            action={excluirServico}
            id={servico.id}
            confirmMsg="Excluir este serviço? Se já houver agendamentos, ele será apenas desativado."
          />
        </div>
      </td>
    </tr>
  );
}
