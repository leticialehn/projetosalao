import type { SessionOptions } from "iron-session";

// Config compartilhada da sessão. Sem `server-only` e sem `next/headers` de
// propósito: este módulo é importado tanto pelas server actions/components
// (via sessao.ts) quanto pelo middleware (runtime Edge).

export interface DadosSessao {
  usuarioId?: string;
  usuario?: string;
  papel?: string;
  /** Só preenchido pra papel PROFISSIONAL (Story 6.1/6.2). */
  profissionalId?: string;
}

export const NOME_COOKIE = "salao_sessao";

export const TTL_HORAS = Number(process.env.SESSION_TTL_HOURS) || 12;

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou com menos de 32 caracteres. " +
        "Defina no .env (local) e nas variáveis do Railway (produção).",
    );
  }
  return s;
}

export function opcoesSessao(): SessionOptions {
  const ttlSeg = TTL_HORAS * 60 * 60;
  return {
    password: segredo(),
    cookieName: NOME_COOKIE,
    ttl: ttlSeg,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ttlSeg,
    },
  };
}
