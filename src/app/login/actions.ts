"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { autenticar } from "@/lib/auth";
import { criarSessao, destruirSessao } from "@/lib/sessao";

export type LoginResult = { ok: boolean; erro?: string };

export async function entrar(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  const generico: LoginResult = { ok: false, erro: "Usuário ou senha inválidos." };

  if (!usuario || !senha) return generico;

  const registro = await prisma.usuario.findUnique({ where: { usuario } });
  const autenticado = await autenticar(registro, senha);
  if (!registro || !autenticado) return generico;

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
