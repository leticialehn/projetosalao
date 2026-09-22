"use client";

import { useActionState } from "react";
import { criarAgendamentoPublico, type AgendarPublicoResult } from "./actions";

const inicial: AgendarPublicoResult = { ok: false };

export default function AgendarConfirmar({
  servicoNome,
  profissionalNome,
  dataHoraLabel,
  servicoId,
  profissionalId,
  inicio,
}: {
  servicoNome: string;
  profissionalNome: string;
  dataHoraLabel: string;
  servicoId: string;
  profissionalId: string;
  inicio: string;
}) {
  const [state, formAction] = useActionState(criarAgendamentoPublico, inicial);

  if (state.ok) {
    return (
      <div className="card">
        <p style={{ color: "var(--ok)", margin: 0 }}>
          Agendamento confirmado para {dataHoraLabel}! Até lá.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>Confirmar agendamento</h2>
      <p className="subtitle" style={{ marginBottom: 16 }}>
        {servicoNome} com {profissionalNome} — {dataHoraLabel}
      </p>
      <form action={formAction}>
        <input type="hidden" name="servicoId" value={servicoId} />
        <input type="hidden" name="profissionalId" value={profissionalId} />
        <input type="hidden" name="inicio" value={inicio} />
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" required />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input id="telefone" name="telefone" />
          </div>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" />
          </div>
        </div>
        {state.erro && (
          <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.erro}</p>
        )}
        <button type="submit">Confirmar agendamento</button>
      </form>
    </div>
  );
}
