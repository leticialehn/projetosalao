"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";

export async function criarServico(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const nome = String(formData.get("nome") ?? "").trim();
  const duracaoMin = Number(formData.get("duracaoMin"));
  const preco = Number(formData.get("preco"));
  if (!nome || !duracaoMin || Number.isNaN(preco)) return;

  await prisma.servico.create({ data: { nome, duracaoMin, preco } });
  revalidatePath("/servicos");
}

export async function atualizarServico(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  const duracaoMin = Number(formData.get("duracaoMin"));
  const preco = Number(formData.get("preco"));
  const ativo = formData.get("ativo") === "on";
  if (!id || !nome) return;

  await prisma.servico.update({
    where: { id },
    data: { nome, duracaoMin, preco, ativo },
  });
  revalidatePath("/servicos");
}

export async function excluirServico(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  const emUso = await prisma.agendamento.count({ where: { servicoId: id } });
  if (emUso > 0) {
    await prisma.servico.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.servico.delete({ where: { id } });
  }
  revalidatePath("/servicos");
}
