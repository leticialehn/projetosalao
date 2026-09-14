"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  remarcarAgendamento,
  mudarStatus,
  type AgendamentoResult,
} from "./agendamentos/actions";
import { toInputValue } from "@/lib/format";
import DialogoConcluir from "./atendimento/DialogoConcluir";

const inicial: AgendamentoResult = { ok: false };

type Prof = { id: string; nome: string };

export default function AgendaAcoes({
  id,
  status,
  inicio,
  profissionalId,
  servicoNome,
  servicoPreco,
  clienteNome,
  profissionais,
}: {
  id: string;
  status: string;
  inicio: string;
  profissionalId: string;
  servicoNome: string;
  servicoPreco: number;
  clienteNome: string;
  profissionais: Prof[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(remarcarAgendamento, inicial);

  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state.ok]);

  if (status !== "AGENDADO") return null;

  return (
    <div className="row-actions">
      <DialogoConcluir
        agendamentoId={id}
        servicoNome={servicoNome}
        servicoPreco={servicoPreco}
        clienteNome={clienteNome}
      />

      <button
        type="button"
        className="link"
        onClick={() => ref.current?.showModal()}
      >
        Remarcar
      </button>

      <form
        action={mudarStatus}
        onSubmit={(e) => {
          if (!confirm("Marcar este atendimento como falta?")) e.preventDefault();
        }}
        style={{ display: "inline" }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="FALTOU" />
        <button className="link">Faltou</button>
      </form>

      <form
        action={mudarStatus}
        onSubmit={(e) => {
          if (!confirm("Cancelar este atendimento?")) e.preventDefault();
        }}
        style={{ display: "inline" }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="status" value="CANCELADO" />
        <button className="link danger">Cancelar</button>
      </form>

      <dialog ref={ref} className="dialogo">
        <h3 style={{ marginTop: 0 }}>Remarcar atendimento</h3>
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <div className="field">
            <label>Novo início</label>
            <input
              name="inicio"
              type="datetime-local"
              defaultValue={toInputValue(inicio)}
              required
            />
          </div>
          <div className="field">
            <label>Profissional</label>
            <select name="profissionalId" defaultValue={profissionalId}>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          {state.erro && <p style={{ color: "var(--danger)" }}>{state.erro}</p>}
          <div className="row-actions">
            <button type="submit">Salvar</button>
            <button
              type="button"
              className="ghost"
              onClick={() => ref.current?.close()}
            >
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
