import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { opcoesSessao, type DadosSessao } from "./sessao-config";

export type { DadosSessao };
export { opcoesSessao };

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

/**
 * Garante que há uma sessão válida. Deve ser a PRIMEIRA linha de toda server
 * action mutadora da área autenticada — o middleware e a guarda de layout não
 * cobrem a execução de server actions de forma confiável (o middleware é
 * contornável — CVE-2025-29927; a guarda de layout roda no re-render, depois
 * da mutação). Sem sessão → redirect para /login (a action não continua).
 */
export async function exigirSessao(): Promise<Required<DadosSessao>> {
  const sessao = await lerSessao();
  if (!sessao.usuarioId) redirect("/login");
  return {
    usuarioId: sessao.usuarioId,
    usuario: sessao.usuario ?? "",
    papel: sessao.papel ?? "",
  };
}
