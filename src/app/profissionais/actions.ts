"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function criarProfissional(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const especialidade = String(formData.get("especialidade") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  if (!nome) return;

  await prisma.profissional.create({ data: { nome, especialidade, telefone } });
  revalidatePath("/profissionais");
}

export async function atualizarProfissional(formData: FormData) {
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  const especialidade = String(formData.get("especialidade") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const ativo = formData.get("ativo") === "on";
  if (!id || !nome) return;

  await prisma.profissional.update({
    where: { id },
    data: { nome, especialidade, telefone, ativo },
  });
  revalidatePath("/profissionais");
}

export type ComissaoResult = { ok: boolean; erro?: string };

export async function definirComissao(
  _prev: ComissaoResult,
  formData: FormData,
): Promise<ComissaoResult> {
  const profissionalId = String(formData.get("profissionalId") ?? "").trim();
  if (!profissionalId) return { ok: false, erro: "Profissional não encontrado." };

  const bruto = String(formData.get("percentual") ?? "").trim();
  // Campo vazio = 0% (decisão da Story 1.3).
  const percentual = bruto === "" ? 0 : Number(bruto.replace(",", "."));

  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { ok: false, erro: "Percentual deve estar entre 0 e 100." };
  }

  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    select: { id: true },
  });
  if (!profissional) return { ok: false, erro: "Profissional não encontrado." };

  await prisma.$transaction([
    prisma.comissaoRegra.upsert({
      where: { profissionalId },
      create: { profissionalId, percentual },
      update: { percentual },
    }),
    prisma.profissional.update({
      where: { id: profissionalId },
      data: { comissaoPercentual: percentual },
    }),
  ]);

  revalidatePath("/profissionais");
  return { ok: true };
}

export async function excluirProfissional(formData: FormData) {
  const id = String(formData.get("id"));
  const emUso = await prisma.agendamento.count({ where: { profissionalId: id } });
  if (emUso > 0) {
    await prisma.profissional.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.profissional.delete({ where: { id } });
  }
  revalidatePath("/profissionais");
}
