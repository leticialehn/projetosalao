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

type SessaoAutenticada = {
  usuarioId: string;
  usuario: string;
  papel: string;
  /** Só presente pra papel PROFISSIONAL — não usar Required<DadosSessao>,
   * que forçaria este campo em todo login (Story 6.2). */
  profissionalId?: string;
};

export async function criarSessao(dados: SessaoAutenticada) {
  const sessao = await lerSessao();
  sessao.usuarioId = dados.usuarioId;
  sessao.usuario = dados.usuario;
  sessao.papel = dados.papel;
  sessao.profissionalId = dados.profissionalId;
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
export async function exigirSessao(): Promise<SessaoAutenticada> {
  const sessao = await lerSessao();
  if (!sessao.usuarioId) redirect("/login");
  return {
    usuarioId: sessao.usuarioId,
    usuario: sessao.usuario ?? "",
    papel: sessao.papel ?? "",
    profissionalId: sessao.profissionalId,
  };
}

export const PAPEL_DONO = "DONO";
export const PAPEL_BALCAO = "BALCAO";
export const PAPEL_PROFISSIONAL = "PROFISSIONAL";

/** Mensagem padrão para ação negada por papel. */
export const ERRO_SEM_PERMISSAO = "Ação permitida apenas para o dono.";

/** Story 6.2 — PROFISSIONAL é somente leitura na agenda; nenhuma escrita. */
export const ERRO_SOMENTE_LEITURA = "Sua conta tem acesso somente leitura à agenda.";

/**
 * Guarda de rota por papel (para `page.tsx` de Server Component). Exige sessão
 * e, se o papel não estiver na lista, redireciona para `/` (o usuário está
 * logado, só não tem acesso àquela área).
 */
export async function exigirPapel(
  ...papeis: string[]
): Promise<SessaoAutenticada> {
  const sessao = await exigirSessao();
  if (!papeis.includes(sessao.papel)) redirect("/");
  return sessao;
}
