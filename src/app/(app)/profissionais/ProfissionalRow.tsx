"use client";

import { useActionState, useState } from "react";
import {
  atualizarProfissional,
  definirComissao,
  definirComissaoServico,
  excluirProfissional,
  type ComissaoResult,
} from "./actions";
import DeleteButton from "@/components/DeleteButton";

type Profissional = {
  id: string;
  nome: string;
  especialidade: string | null;
  telefone: string | null;
  ativo: boolean;
  comissaoPercentual: number;
  comissaoRegras?: { servicoId: string | null; percentual: number }[];
};

type Servico = { id: string; nome: string };

const inicial: ComissaoResult = { ok: false };

function formatarPercentual(valor: number) {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function ProfissionalRow({
  p,
  servicos,
}: {
  p: Profissional;
  servicos: Servico[];
}) {
  const [editando, setEditando] = useState(false);
  const [state, comissaoAction] = useActionState(definirComissao, inicial);
  const [stateServico, comissaoServicoAction] = useActionState(
    definirComissaoServico,
    inicial,
  );

  const regraGeral = p.comissaoRegras?.find((r) => r.servicoId === null);
  const percentual = regraGeral?.percentual ?? p.comissaoPercentual ?? 0;
  const percentualPorServico = new Map(
    (p.comissaoRegras ?? [])
      .filter((r) => r.servicoId !== null)
      .map((r) => [r.servicoId as string, r.percentual]),
  );

  if (editando) {
    return (
      <tr>
        <td colSpan={5}>
          <form action={atualizarProfissional}>
            <input type="hidden" name="id" value={p.id} />
            <div className="form-row">
              <div className="field">
                <label>Nome</label>
                <input name="nome" defaultValue={p.nome} required />
              </div>
              <div className="field">
                <label>Especialidade</label>
                <input name="especialidade" defaultValue={p.especialidade ?? ""} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Telefone</label>
                <input name="telefone" defaultValue={p.telefone ?? ""} />
              </div>
              <div className="field">
                <label>
                  <input
                    type="checkbox"
                    name="ativo"
                    defaultChecked={p.ativo}
                    style={{ width: "auto", marginRight: 6 }}
                  />
                  Ativo
                </label>
              </div>
            </div>
            <div className="row-actions">
              <button type="submit">Salvar</button>
              <button type="button" className="ghost" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </form>

          <form action={comissaoAction}>
            <input type="hidden" name="profissionalId" value={p.id} />
            <div className="form-row">
              <div className="field">
                <label>Comissão (%)</label>
                <input
                  name="percentual"
                  inputMode="decimal"
                  placeholder="Ex.: 40 ou 40,5"
                  defaultValue={formatarPercentual(percentual)}
                />
              </div>
              <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit">Salvar comissão</button>
              </div>
            </div>
            {state.erro && (
              <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.erro}</p>
            )}
            {state.ok && (
              <p style={{ color: "var(--ok)", margin: "0 0 12px" }}>Comissão atualizada.</p>
            )}
          </form>

          {servicos.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Comissão por serviço (opcional — vazio usa a comissão geral acima)
              </label>
              <div className="form-row" style={{ flexWrap: "wrap" }}>
                {servicos.map((s) => (
                  <form
                    key={s.id}
                    action={comissaoServicoAction}
                    className="field"
                    style={{ minWidth: 160, margin: 0 }}
                  >
                    <input type="hidden" name="profissionalId" value={p.id} />
                    <input type="hidden" name="servicoId" value={s.id} />
                    <label>{s.nome}</label>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        name="percentual"
                        inputMode="decimal"
                        placeholder="Geral"
                        defaultValue={
                          percentualPorServico.has(s.id)
                            ? formatarPercentual(percentualPorServico.get(s.id)!)
                            : ""
                        }
                      />
                      <button type="submit" className="ghost">
                        Salvar
                      </button>
                    </div>
                  </form>
                ))}
              </div>
              {stateServico.erro && (
                <p style={{ color: "var(--danger)", margin: "8px 0 0" }}>{stateServico.erro}</p>
              )}
              {stateServico.ok && (
                <p style={{ color: "var(--ok)", margin: "8px 0 0" }}>
                  Comissão por serviço atualizada.
                </p>
              )}
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{p.nome}</td>
      <td>{p.especialidade ?? <span className="muted">—</span>}</td>
      <td>{p.telefone ?? <span className="muted">—</span>}</td>
      <td>
        Comissão: {formatarPercentual(percentual)}%
        {percentualPorServico.size > 0 && (
          <span className="muted"> ({percentualPorServico.size} por serviço)</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          {p.ativo ? (
            <span className="badge CONCLUIDO">Ativo</span>
          ) : (
            <span className="badge off">Inativo</span>
          )}
          <button className="link" onClick={() => setEditando(true)}>
            Editar
          </button>
          <DeleteButton
            action={excluirProfissional}
            id={p.id}
            confirmMsg="Excluir este profissional? Se já houver agendamentos, ele será apenas desativado."
          />
        </div>
      </td>
    </tr>
  );
}
