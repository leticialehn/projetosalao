"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { autenticar } from "@/lib/auth";
import { criarSessao, destruirSessao } from "@/lib/sessao";
import {
  segundosDeEspera,
  registrarFalha,
  limparTentativas,
} from "@/lib/rate-limit";

export type LoginResult = { ok: boolean; erro?: string };

async function ipDoCliente(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function entrar(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const generico: LoginResult = { ok: false, erro: "Usuário ou senha inválidos." };

  const ip = await ipDoCliente();
  const espera = segundosDeEspera(ip);
  if (espera > 0) {
    const min = Math.ceil(espera / 60);
    return {
      ok: false,
      erro: `Muitas tentativas de login. Tente novamente em ${min} min.`,
    };
  }

  if (!usuario || !senha) return generico;

  const registro = await prisma.usuario.findUnique({ where: { usuario } });
  const autenticado = await autenticar(registro, senha);
  if (!registro || !autenticado) {
    registrarFalha(ip);
    return generico;
  }

  limparTentativas(ip);
  await criarSessao({
    usuarioId: registro.id,
    usuario: registro.usuario,
    papel: registro.papel,
  });
  redirect("/");
}

export async function sair() {
  await destruirSessao();
  redirect("/login");
}
