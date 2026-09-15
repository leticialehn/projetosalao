"use client";

import { useActionState } from "react";
import { registrarMovimento, type MovimentoResult } from "./actions";
import { toInputValue } from "@/lib/format";

const inicial: MovimentoResult = { ok: false };

export default function FormMovimento({
  produtoId,
  podeRegistrarEntrada,
}: {
  produtoId: string;
  podeRegistrarEntrada: boolean;
}) {
  const [state, formAction] = useActionState(registrarMovimento, inicial);

  return (
    <form action={formAction}>
      <input type="hidden" name="produtoId" value={produtoId} />
      <div className="form-row">
        <div className="field">
          <label>Tipo</label>
          <select name="tipo" required defaultValue="SAIDA">
            {podeRegistrarEntrada && <option value="ENTRADA">Entrada</option>}
            <option value="SAIDA">Saída</option>
          </select>
        </div>
        <div className="field">
          <label>Quantidade</label>
          <input
            name="quantidade"
            inputMode="decimal"
            placeholder="Ex.: 1 ou 1,5"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Motivo</label>
          <input
            name="motivo"
            placeholder="Ex.: Compra fornecedor, Uso em atendimento, Perda"
            required
          />
        </div>
        <div className="field">
          <label>Data</label>
          <input
            name="data"
            type="datetime-local"
            defaultValue={toInputValue(new Date())}
            required
          />
        </div>
      </div>
      {state.erro && (
        <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.erro}</p>
      )}
      {state.ok && (
        <p style={{ color: "var(--ok)", margin: "0 0 12px" }}>
          Movimentação registrada.
        </p>
      )}
      <button type="submit">Registrar</button>
    </form>
  );
}
