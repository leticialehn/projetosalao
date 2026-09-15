"use client";

import { useActionState, useState } from "react";
import { criarAgendamento, type AgendamentoResult } from "./actions";

type Opt = { id: string; nome: string };
type ProfissionalOpt = Opt & { servicoIds: string[] };

const inicial: AgendamentoResult = { ok: false };

type Inicial = {
  inicio?: string | null;
  profissionalId?: string | null;
  clienteId?: string | null;
};

export default function NovoAgendamento({
  clientes,
  profissionais,
  servicos,
  inicial: pre = {},
}: {
  clientes: Opt[];
  profissionais: ProfissionalOpt[];
  servicos: { id: string; nome: string; duracaoMin: number }[];
  inicial?: Inicial;
}) {
  const [state, formAction] = useActionState(criarAgendamento, inicial);
  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState(pre.profissionalId ?? "");

  // Sem serviço escolhido ainda: mostra todos (comportamento atual). Com
  // serviço escolhido: só quem atende, mais quem não tem nenhum vínculo
  // configurado (retrocompatibilidade — Story 5.1, AC 2).
  const profissionaisVisiveis = !servicoId
    ? profissionais
    : profissionais.filter(
        (p) => p.servicoIds.length === 0 || p.servicoIds.includes(servicoId),
      );

  function selecionarServico(novoServicoId: string) {
    setServicoId(novoServicoId);
    const aindaValido = profissionais
      .filter(
        (p) =>
          p.servicoIds.length === 0 || p.servicoIds.includes(novoServicoId),
      )
      .some((p) => p.id === profissionalId);
    if (!aindaValido) setProfissionalId("");
  }

  return (
    <div className="card">
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Novo agendamento</h2>
      <form action={formAction}>
        <div className="form-row">
          <div className="field">
            <label>Cliente</label>
            <select
              name="clienteId"
              required
              defaultValue={pre.clienteId ?? ""}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Serviço</label>
            <select
              name="servicoId"
              required
              value={servicoId}
              onChange={(e) => selecionarServico(e.target.value)}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} ({s.duracaoMin} min)
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Profissional</label>
            <select
              name="profissionalId"
              required
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {profissionaisVisiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Início</label>
            <input
              name="inicio"
              type="datetime-local"
              required
              defaultValue={pre.inicio ?? undefined}
            />
          </div>
        </div>
        <div className="field">
          <label>Observações</label>
          <textarea name="observacoes" rows={2} />
        </div>
        {state.erro && (
          <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.erro}</p>
        )}
        {state.ok && (
          <p style={{ color: "var(--ok)", margin: "0 0 12px" }}>
            Agendamento criado.
          </p>
        )}
        <button type="submit">Agendar</button>
      </form>
    </div>
  );
}
