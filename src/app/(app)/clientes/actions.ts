"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";

export async function criarCliente(formData: FormData) {
  await exigirSessao();
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  if (!nome) return;

  await prisma.cliente.create({ data: { nome, telefone, email, observacoes } });
  revalidatePath("/clientes");
}

export async function atualizarCliente(formData: FormData) {
  await exigirSessao();
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  if (!id || !nome) return;

  await prisma.cliente.update({
    where: { id },
    data: { nome, telefone, email, observacoes },
  });
  revalidatePath("/clientes");
}

export async function atualizarObservacoesCliente({
  id,
  observacoes,
}: {
  id: string;
  observacoes: string;
}) {
  await exigirSessao();
  if (!id) return;
  const texto = observacoes.trim() || null;

  await prisma.cliente.update({ where: { id }, data: { observacoes: texto } });
  revalidatePath("/clientes/" + id);
  revalidatePath("/clientes");
}

export async function excluirCliente(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  const emUso = await prisma.agendamento.count({ where: { clienteId: id } });
  if (emUso > 0) return;
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
