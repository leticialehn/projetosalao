"use client";

import { useActionState, useState } from "react";
import { criarMeta, excluirMeta, type MetaResult } from "./actions";
import { brl } from "@/lib/format";

const inicial: MetaResult = { ok: false };

const TIPO_LABEL: Record<string, string> = {
  FATURAMENTO: "Faturamento",
  COMISSAO: "Comissão",
};

type Profissional = { id: string; nome: string };
type Meta = {
  id: string;
  tipo: string;
  profissionalNome: string | null;
  periodoInicio: string;
  periodoFim: string;
  valorAlvo: number;
};

export default function Metas({
  profissionais,
  metas,
  periodoInicioDefault,
  periodoFimDefault,
}: {
  profissionais: Profissional[];
  metas: Meta[];
  periodoInicioDefault: string;
  periodoFimDefault: string;
}) {
  const [novoState, novoAction] = useActionState(criarMeta, inicial);
  const [profissionalId, setProfissionalId] = useState("");

  return (
    <>
      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Nova meta</h2>
        <form action={novoAction}>
          <div className="form-row">
            <div className="field">
              <label>Escopo</label>
              <select
                name="profissionalId"
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
              >
                <option value="">Salão inteiro</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            {profissionalId && (
              <div className="field">
                <label>Tipo</label>
                <select name="tipo" defaultValue="FATURAMENTO">
                  <option value="FATURAMENTO">Faturamento</option>
                  <option value="COMISSAO">Comissão</option>
                </select>
              </div>
            )}
          </div>
          <div className="form-row">
            <div className="field">
              <label>De</label>
              <input
                type="date"
                name="periodoInicio"
                defaultValue={periodoInicioDefault}
                required
              />
            </div>
            <div className="field">
              <label>Até</label>
              <input
                type="date"
                name="periodoFim"
                defaultValue={periodoFimDefault}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Valor-alvo</label>
              <input
                name="valorAlvo"
                type="number"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit">Criar meta</button>
            </div>
          </div>
          {novoState.erro && (
            <p style={{ color: "var(--danger)", margin: 0 }}>{novoState.erro}</p>
          )}
          {novoState.ok && (
            <p style={{ color: "var(--ok)", margin: 0 }}>Meta criada.</p>
          )}
        </form>
      </div>

      <div className="card">
        {metas.length === 0 ? (
          <div className="empty">Nenhuma meta cadastrada.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Escopo</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Valor-alvo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metas.map((m) => (
                <tr key={m.id}>
                  <td>{m.profissionalNome ?? "Salão inteiro"}</td>
                  <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                  <td>
                    {m.periodoInicio} a {m.periodoFim}
                  </td>
                  <td>{brl(m.valorAlvo)}</td>
                  <td>
                    <form action={excluirMeta}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="link danger"
                        onClick={(e) => {
                          if (!confirm("Excluir esta meta?")) e.preventDefault();
                        }}
                      >
                        Excluir
                      </button>
                    </form>
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
