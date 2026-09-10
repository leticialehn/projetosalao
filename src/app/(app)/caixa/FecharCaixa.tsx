"use client";

import { useState, useTransition } from "react";
import { fecharCaixa, reabrirCaixa } from "./actions";

export default function FecharCaixa({
  data,
  fechado,
}: {
  data: string;
  fechado: boolean;
}) {
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setErro(r.erro ?? "Não foi possível concluir a operação.");
      else setObservacoes("");
    });
  }

  if (fechado) {
    return (
      <>
        {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}
        <div className="row-actions">
          <button
            type="button"
            className="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm("Reabrir o caixa deste dia?")) return;
              executar(() => reabrirCaixa(data));
            }}
          >
            {pending ? "Reabrindo…" : "Reabrir"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="field">
        <label htmlFor="observacoes">Observações (opcional)</label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex.: sangria de R$ 50 para troco"
        />
      </div>

      {erro && <p style={{ color: "var(--danger)" }}>{erro}</p>}

      <div className="row-actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => executar(() => fecharCaixa(data, observacoes))}
        >
          {pending ? "Fechando…" : "Fechar caixa"}
        </button>
      </div>
    </>
  );
}
