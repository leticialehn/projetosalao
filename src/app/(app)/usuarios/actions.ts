"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  PAPEL_DONO,
  PAPEL_BALCAO,
  PAPEL_PROFISSIONAL,
  ERRO_SEM_PERMISSAO,
} from "@/lib/sessao";

export type UsuarioResult = { ok: boolean; erro?: string };

async function soDono(): Promise<UsuarioResult | null> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };
  return null;
}

/** Papéis que `mudarPapelUsuario` aceita — conversão para/de PROFISSIONAL fica fora desta fatia. */
function papelValido(p: string): p is typeof PAPEL_DONO | typeof PAPEL_BALCAO {
  return p === PAPEL_DONO || p === PAPEL_BALCAO;
}

/** Papéis que `criarUsuario` aceita — inclui PROFISSIONAL, que exige `profissionalId`. */
function papelCriacaoValido(
  p: string,
): p is typeof PAPEL_DONO | typeof PAPEL_BALCAO | typeof PAPEL_PROFISSIONAL {
  return p === PAPEL_DONO || p === PAPEL_BALCAO || p === PAPEL_PROFISSIONAL;
}

/** Quantos DONO restariam se o usuário `id` deixasse de ser DONO. */
async function outrosDonos(id: string): Promise<number> {
  return prisma.usuario.count({ where: { papel: PAPEL_DONO, id: { not: id } } });
}

export async function criarUsuario(
  _prev: UsuarioResult,
  formData: FormData,
): Promise<UsuarioResult> {
  const bloqueio = await soDono();
  if (bloqueio) return bloqueio;

  const usuario = String(formData.get("usuario") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const papel = String(formData.get("papel") ?? "");

  if (!usuario || !senha) {
    return { ok: false, erro: "Preencha usuário e senha." };
  }
  if (senha.length < 8) {
    return { ok: false, erro: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (!papelCriacaoValido(papel)) {
    return { ok: false, erro: "Papel inválido." };
  }

  let profissionalId: string | undefined;
  if (papel === PAPEL_PROFISSIONAL) {
    profissionalId = String(formData.get("profissionalId") ?? "").trim();
    if (!profissionalId) {
      return { ok: false, erro: "Selecione o profissional." };
    }
    const profissional = await prisma.profissional.findUnique({
      where: { id: profissionalId },
      select: { ativo: true, usuario: { select: { id: true } } },
    });
    if (!profissional) {
      return { ok: false, erro: "Profissional não encontrado." };
    }
    if (!profissional.ativo) {
      return { ok: false, erro: "Profissional inativo." };
    }
    if (profissional.usuario) {
      return { ok: false, erro: "Este profissional já tem um login." };
    }
  }

  const existe = await prisma.usuario.findUnique({ where: { usuario } });
  if (existe) {
    return { ok: false, erro: "Já existe um usuário com esse nome." };
  }

  await prisma.usuario.create({
    data: {
      usuario,
      senhaHash: await bcrypt.hash(senha, 10),
      papel,
      profissionalId,
    },
  });
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function trocarSenhaUsuario(
  _prev: UsuarioResult,
  formData: FormData,
): Promise<UsuarioResult> {
  const bloqueio = await soDono();
  if (bloqueio) return bloqueio;

  const id = String(formData.get("id") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (!id) return { ok: false, erro: "Usuário não informado." };
  if (senha.length < 8) {
    return { ok: false, erro: "A senha deve ter pelo menos 8 caracteres." };
  }

  await prisma.usuario.update({
    where: { id },
    data: { senhaHash: await bcrypt.hash(senha, 10) },
  });
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function mudarPapelUsuario(
  _prev: UsuarioResult,
  formData: FormData,
): Promise<UsuarioResult> {
  const bloqueio = await soDono();
  if (bloqueio) return bloqueio;

  const id = String(formData.get("id") ?? "");
  const papel = String(formData.get("papel") ?? "");
  if (!id) return { ok: false, erro: "Dados inválidos." };
  if (!papelValido(papel)) {
    // Cobre também papel === PAPEL_PROFISSIONAL: conversão para/de
    // PROFISSIONAL fica fora desta fatia (ver Story 6.1, Dev Notes).
    return { ok: false, erro: "Papel inválido." };
  }

  if (papel === PAPEL_BALCAO && (await outrosDonos(id)) === 0) {
    return {
      ok: false,
      erro: "Não é possível rebaixar o último dono.",
    };
  }

  await prisma.usuario.update({ where: { id }, data: { papel } });
  revalidatePath("/usuarios");
  return { ok: true };
}

export async function removerUsuario(
  _prev: UsuarioResult,
  formData: FormData,
): Promise<UsuarioResult> {
  const bloqueio = await soDono();
  if (bloqueio) return bloqueio;

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, erro: "Usuário não informado." };

  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) return { ok: false, erro: "Usuário não encontrado." };

  if (alvo.papel === PAPEL_DONO && (await outrosDonos(id)) === 0) {
    return { ok: false, erro: "Não é possível remover o último dono." };
  }

  await prisma.usuario.delete({ where: { id } });
  revalidatePath("/usuarios");
  return { ok: true };
}
