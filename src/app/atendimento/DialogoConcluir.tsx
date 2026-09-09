"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { concluirAtendimento, type ConcluirResult } from "./actions";
import { brl, FORMA_PAGAMENTO_LABEL } from "@/lib/format";
import { FORMAS_PAGAMENTO, somarPagamentos, reais } from "@/lib/financeiro";

const inicial: ConcluirResult = { ok: false };

type Linha = { valor: string; formaPagamento: string };

export default function DialogoConcluir({
  agendamentoId,
  servicoNome,
  servicoPreco,
  clienteNome,
  gatilho = "Concluir e receber",
  className = "link",
}: {
  agendamentoId: string;
  servicoNome: string;
  servicoPreco: number;
  clienteNome: string;
  gatilho?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(
    concluirAtendimento,
    inicial,
  );
  const [valorCobrado, setValorCobrado] = useState(String(servicoPreco));
  const [cortesia, setCortesia] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([
    { valor: String(servicoPreco), formaPagamento: "DINHEIRO" },
  ]);

  useEffect(() => {
    if (state.ok) ref.current?.close();
  }, [state.ok]);

  const soma = cortesia
    ? 0
    : somarPagamentos(
        linhas
          .map((l) => ({
            valor: Number(l.valor.replace(",", ".")),
            formaPagamento: l.formaPagamento as (typeof FORMAS_PAGAMENTO)[number],
          }))
          .filter((l) => Number.isFinite(l.valor) && l.valor > 0),
      );
  const alvo = reais(Number(valorCobrado.replace(",", ".")) || 0);
  const confere = cortesia || (alvo > 0 && soma === alvo);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => ref.current?.showModal()}
      >
        {gatilho}
      </button>

      <dialog ref={ref} className="dialogo">
        <form method="dialog" style={{ margin: 0 }}>
          <button className="link" aria-label="Fechar" style={{ float: "right" }}>
            ✕
          </button>
        </form>
        <h3 style={{ marginTop: 0 }}>Concluir e receber</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {clienteNome} — {servicoNome}
        </p>

        <form action={formAction}>
          <input type="hidden" name="agendamentoId" value={agendamentoId} />
          <input
            type="hidden"
            name="pagamentos"
            value={JSON.stringify(
              cortesia
                ? []
                : linhas
                    .map((l) => ({
                      valor: Number(l.valor.replace(",", ".")),
                      formaPagamento: l.formaPagamento,
                    }))
                    .filter((l) => Number.isFinite(l.valor) && l.valor > 0),
            )}
          />

          <div className="field">
            <label>Valor cobrado</label>
            <input
              name="valorCobrado"
              inputMode="decimal"
              value={valorCobrado}
              disabled={cortesia}
              onChange={(e) => setValorCobrado(e.target.value)}
            />
          </div>

          {!cortesia && (
            <div className="card" style={{ margin: "12px 0" }}>
              {linhas.map((l, i) => (
                <div className="form-row" key={i}>
                  <div className="field">
                    <label>Valor</label>
                    <input
                      inputMode="decimal"
                      value={l.valor}
                      onChange={(e) =>
                        setLinhas((ls) =>
                          ls.map((x, j) =>
                            j === i ? { ...x, valor: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Forma</label>
                    <select
                      value={l.formaPagamento}
                      onChange={(e) =>
                        setLinhas((ls) =>
                          ls.map((x, j) =>
                            j === i
                              ? { ...x, formaPagamento: e.target.value }
                              : x,
                          ),
                        )
                      }
                    >
                      {FORMAS_PAGAMENTO.map((f) => (
                        <option key={f} value={f}>
                          {FORMA_PAGAMENTO_LABEL[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ justifyContent: "flex-end" }}>
                    {linhas.length > 1 && (
                      <button
                        type="button"
                        className="link danger"
                        onClick={() =>
                          setLinhas((ls) => ls.filter((_, j) => j !== i))
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  setLinhas((ls) => [
                    ...ls,
                    { valor: "", formaPagamento: "DINHEIRO" },
                  ])
                }
              >
                + Adicionar pagamento
              </button>
            </div>
          )}

          <label style={{ display: "block", margin: "8px 0" }}>
            <input
              type="checkbox"
              name="cortesia"
              checked={cortesia}
              onChange={(e) => setCortesia(e.target.checked)}
              style={{ width: "auto", marginRight: 6 }}
            />
            Concluir sem pagamento (cortesia)
          </label>

          {!cortesia && (
            <p style={{ margin: "8px 0" }}>
              Soma: <strong>{brl(soma)}</strong> / Cobrado:{" "}
              <strong>{brl(alvo)}</strong>
            </p>
          )}

          {state.erro && (
            <p style={{ color: "var(--danger)" }}>{state.erro}</p>
          )}

          <div className="row-actions">
            <button type="submit" disabled={!confere || pending}>
              {pending ? "Salvando…" : "Confirmar"}
            </button>
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
    </>
  );
}
