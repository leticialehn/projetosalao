"use client";

import { useActionState } from "react";
import { salvarComissaoBase, type TaxaResult } from "./actions";

const inicial: TaxaResult = { ok: false };

export default function ComissaoBaseForm({
  comissaoBase,
}: {
  comissaoBase: string;
}) {
  const [state, action, pending] = useActionState(salvarComissaoBase, inicial);

  return (
    <form
      action={action}
      className="form-row"
      style={{ alignItems: "center", gap: 8 }}
    >
      <select name="comissaoBase" defaultValue={comissaoBase}>
        <option value="BRUTO">Bruto</option>
        <option value="LIQUIDO">Líquido (após taxa da maquininha)</option>
      </select>
      <button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
      {state.erro && <span style={{ color: "var(--danger)" }}>{state.erro}</span>}
      {state.ok && <span style={{ color: "var(--ok)" }}>Salvo.</span>}
    </form>
  );
}
