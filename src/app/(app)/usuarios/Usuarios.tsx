"use client";

import { useActionState, useState } from "react";
import {
  criarUsuario,
  trocarSenhaUsuario,
  mudarPapelUsuario,
  removerUsuario,
  type UsuarioResult,
} from "./actions";

const inicial: UsuarioResult = { ok: false };

type Usuario = {
  id: string;
  usuario: string;
  papel: string;
  criadoEm: string;
  profissionalNome: string | null;
};

const LABEL: Record<string, string> = {
  DONO: "Dono",
  BALCAO: "Balcão",
  PROFISSIONAL: "Profissional",
};

type ProfissionalOpcao = { id: string; nome: string };

export default function Usuarios({
  usuarios,
  usuarioAtualId,
  totalDonos,
  profissionaisDisponiveis,
}: {
  usuarios: Usuario[];
  usuarioAtualId: string;
  totalDonos: number;
  profissionaisDisponiveis: ProfissionalOpcao[];
}) {
  const [novoState, novoAction] = useActionState(criarUsuario, inicial);
  const [papelNovo, setPapelNovo] = useState("BALCAO");

  return (
    <>
      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo usuário</h2>
        <form action={novoAction}>
          <div className="form-row">
            <div className="field">
              <label>Usuário</label>
              <input name="usuario" autoComplete="off" required />
            </div>
            <div className="field">
              <label>Senha (mín. 8)</label>
              <input name="senha" type="password" autoComplete="new-password" required />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Papel</label>
              <select
                name="papel"
                defaultValue="BALCAO"
                onChange={(e) => setPapelNovo(e.target.value)}
              >
                <option value="BALCAO">Balcão</option>
                <option value="DONO">Dono</option>
                <option value="PROFISSIONAL">Profissional</option>
              </select>
            </div>
            {papelNovo === "PROFISSIONAL" ? (
              <div className="field">
                <label>Profissional</label>
                {profissionaisDisponiveis.length === 0 ? (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Nenhum profissional ativo disponível para vincular.
                  </p>
                ) : (
                  <select name="profissionalId" defaultValue="">
                    <option value="" disabled>
                      Selecione
                    </option>
                    {profissionaisDisponiveis.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit">Adicionar</button>
              </div>
            )}
          </div>
          {papelNovo === "PROFISSIONAL" && (
            <div className="row-actions" style={{ marginTop: 8 }}>
              <button type="submit" disabled={profissionaisDisponiveis.length === 0}>
                Adicionar
              </button>
            </div>
          )}
          {novoState.erro && (
            <p style={{ color: "var(--danger)", margin: 0 }}>{novoState.erro}</p>
          )}
          {novoState.ok && (
            <p style={{ color: "var(--ok)", margin: 0 }}>Usuário criado.</p>
          )}
        </form>
      </div>

      <div className="card">
        {usuarios.length === 0 ? (
          <div className="empty">Nenhum usuário.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <LinhaUsuario
                  key={u.id}
                  u={u}
                  ehEu={u.id === usuarioAtualId}
                  ultimoDono={u.papel === "DONO" && totalDonos <= 1}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function LinhaUsuario({
  u,
  ehEu,
  ultimoDono,
}: {
  u: Usuario;
  ehEu: boolean;
  ultimoDono: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [senhaState, senhaAction] = useActionState(trocarSenhaUsuario, inicial);
  const [papelState, papelAction] = useActionState(mudarPapelUsuario, inicial);
  const [remState, remAction] = useActionState(removerUsuario, inicial);

  return (
    <>
      <tr>
        <td>
          {u.usuario}
          {ehEu && <span className="muted"> (você)</span>}
        </td>
        <td>
          <span className={`badge ${u.papel === "DONO" ? "CONCLUIDO" : "AGENDADO"}`}>
            {LABEL[u.papel] ?? u.papel}
          </span>
          {u.profissionalNome && (
            <span className="muted"> — {u.profissionalNome}</span>
          )}
        </td>
        <td className="muted">{u.criadoEm}</td>
        <td>
          <div className="row-actions">
            <button className="link" onClick={() => setEditando((v) => !v)}>
              {editando ? "Fechar" : "Gerenciar"}
            </button>
          </div>
        </td>
      </tr>
      {editando && (
        <tr>
          <td colSpan={4}>
            <div className="form-row">
              <form action={senhaAction} className="field" style={{ margin: 0 }}>
                <input type="hidden" name="id" value={u.id} />
                <label>Trocar senha</label>
                <div className="row-actions">
                  <input name="senha" type="password" placeholder="Nova senha (mín. 8)" />
                  <button type="submit">Salvar</button>
                </div>
                {senhaState.erro && (
                  <p style={{ color: "var(--danger)", margin: "4px 0 0" }}>{senhaState.erro}</p>
                )}
                {senhaState.ok && (
                  <p style={{ color: "var(--ok)", margin: "4px 0 0" }}>Senha alterada.</p>
                )}
              </form>

              <form action={papelAction} className="field" style={{ margin: 0 }}>
                <input type="hidden" name="id" value={u.id} />
                <label>Papel</label>
                <div className="row-actions">
                  <select name="papel" defaultValue={u.papel} disabled={ultimoDono}>
                    <option value="BALCAO">Balcão</option>
                    <option value="DONO">Dono</option>
                  </select>
                  <button type="submit" disabled={ultimoDono}>
                    Aplicar
                  </button>
                </div>
                {ultimoDono && (
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                    Único dono — não pode mudar.
                  </p>
                )}
                {papelState.erro && (
                  <p style={{ color: "var(--danger)", margin: "4px 0 0" }}>{papelState.erro}</p>
                )}
              </form>
            </div>

            <form
              action={remAction}
              onSubmit={(e) => {
                if (!confirm(`Remover o usuário "${u.usuario}"?`)) e.preventDefault();
              }}
              style={{ marginTop: 8 }}
            >
              <input type="hidden" name="id" value={u.id} />
              <button type="submit" className="link danger" disabled={ultimoDono}>
                Remover usuário
              </button>
              {remState.erro && (
                <span style={{ color: "var(--danger)", marginLeft: 8 }}>{remState.erro}</span>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
