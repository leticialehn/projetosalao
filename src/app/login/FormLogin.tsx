"use client";

import { useActionState } from "react";
import { entrar, type LoginResult } from "./actions";

const inicial: LoginResult = { ok: false };

export default function FormLogin() {
  const [state, formAction, pending] = useActionState(entrar, inicial);

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="usuario">Usuário</label>
        <input id="usuario" name="usuario" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.erro && (
        <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.erro}</p>
      )}
      <button type="submit" disabled={pending} style={{ width: "100%" }}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
