"use client";

import { useState, useTransition } from "react";
import { atualizarObservacoesCliente } from "../actions";

export default function Observacoes({
  id,
  observacoes,
}: {
  id: string;
  observacoes: string | null;
}) {
  const [texto, setTexto] = useState(observacoes ?? "");
  const [salvo, setSalvo] = useState(false);
  const [pendente, startTransition] = useTransition();

  function salvar() {
    setSalvo(false);
    startTransition(async () => {
      await atualizarObservacoesCliente({ id, observacoes: texto });
      setSalvo(true);
    });
  }

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="observacoes">Observações</label>
      <textarea
        id="observacoes"
        rows={3}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setSalvo(false);
        }}
        placeholder="Preferências, alergias, etc."
      />
      <div className="row-actions" style={{ alignItems: "center" }}>
        <button type="button" onClick={salvar} disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar observações"}
        </button>
        {salvo && !pendente && <span className="muted">Salvo.</span>}
      </div>
    </div>
  );
}
