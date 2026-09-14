"use client";

import Link from "next/link";
import { useState } from "react";
import { atualizarCliente, excluirCliente } from "./actions";
import DeleteButton from "@/components/DeleteButton";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
  _count: { agendamentos: number };
};

export default function ClienteRow({
  c,
  podeExcluir = false,
}: {
  c: Cliente;
  podeExcluir?: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <tr>
        <td colSpan={5}>
          <form action={atualizarCliente}>
            <input type="hidden" name="id" value={c.id} />
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input name="nome" defaultValue={c.nome} required />
              </div>
              <div className="field">
                <label>Telefone</label>
                <input name="telefone" defaultValue={c.telefone ?? ""} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>E-mail</label>
                <input name="email" type="email" defaultValue={c.email ?? ""} />
              </div>
              <div className="field" />
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea name="observacoes" rows={2} defaultValue={c.observacoes ?? ""} />
            </div>
            <div className="row-actions">
              <button type="submit">Salvar</button>
              <button type="button" className="ghost" onClick={() => setEditando(false)}>
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
        <Link href={`/clientes/${c.id}`} style={{ fontWeight: 600 }}>
          {c.nome}
        </Link>
      </td>
      <td>{c.telefone ?? <span className="muted">—</span>}</td>
      <td>{c.email ?? <span className="muted">—</span>}</td>
      <td>{c._count.agendamentos}</td>
      <td>
        <div className="row-actions">
          <button className="link" onClick={() => setEditando(true)}>
            Editar
          </button>
          {podeExcluir && c._count.agendamentos === 0 && (
            <DeleteButton action={excluirCliente} id={c.id} confirmMsg="Excluir este cliente?" />
          )}
        </div>
      </td>
    </tr>
  );
}
