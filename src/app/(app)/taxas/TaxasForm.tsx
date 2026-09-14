"use client";

import { useActionState } from "react";
import { salvarTaxa, type TaxaResult } from "./actions";

const inicial: TaxaResult = { ok: false };

export default function TaxasForm({
  forma,
  label,
  percentual,
  valorFixo,
}: {
  forma: string;
  label: string;
  percentual: number;
  valorFixo: number;
}) {
  const [state, action, pending] = useActionState(salvarTaxa, inicial);

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{label}</td>
      <td colSpan={3}>
        <form
          action={action}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input type="hidden" name="formaPagamento" value={forma} />
          <input
            name="percentual"
            inputMode="decimal"
            defaultValue={String(percentual)}
            aria-label={`Percentual ${label}`}
            style={{ maxWidth: 110 }}
          />
          <input
            name="valorFixo"
            inputMode="decimal"
            defaultValue={String(valorFixo)}
            aria-label={`Valor fixo ${label}`}
            style={{ maxWidth: 130 }}
          />
          <button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
          {state.erro && (
            <span style={{ color: "var(--danger)" }}>{state.erro}</span>
          )}
          {state.ok && <span style={{ color: "var(--ok)" }}>Salvo.</span>}
        </form>
      </td>
    </tr>
  );
}
