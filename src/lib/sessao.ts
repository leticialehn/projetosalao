import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface DadosSessao {
  usuarioId?: string;
  usuario?: string;
  papel?: string;
}

const TTL_HORAS = Number(process.env.SESSION_TTL_HOURS) || 12;

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
  return {
    password: segredo(),
    cookieName: "salao_sessao",
    ttl: TTL_HORAS * 60 * 60,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TTL_HORAS * 60 * 60,
    },
  };
}

/** Lê a sessão do request atual (Server Component / Server Action). */
export async function lerSessao() {
  return getIronSession<DadosSessao>(await cookies(), opcoesSessao());
}

export async function criarSessao(dados: Required<DadosSessao>) {
  const sessao = await lerSessao();
  sessao.usuarioId = dados.usuarioId;
  sessao.usuario = dados.usuario;
  sessao.papel = dados.papel;
  await sessao.save();
}

export async function destruirSessao() {
  const sessao = await lerSessao();
  sessao.destroy();
}
