"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";

export async function criarProduto(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const unidade = String(formData.get("unidade") ?? "").trim() || null;
  const estoqueMinimo = Number(formData.get("estoqueMinimo") ?? 0);
  if (!nome || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) return;

  await prisma.produto.create({
    data: { nome, categoria, unidade, estoqueMinimo },
  });
  revalidatePath("/produtos");
}

export async function atualizarProduto(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const unidade = String(formData.get("unidade") ?? "").trim() || null;
  const estoqueMinimo = Number(formData.get("estoqueMinimo") ?? 0);
  const ativo = formData.get("ativo") === "on";
  if (!id || !nome || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) return;

  await prisma.produto.update({
    where: { id },
    data: { nome, categoria, unidade, estoqueMinimo, ativo },
  });
  revalidatePath("/produtos");
}

export async function excluirProduto(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  if (!id) return;
  // Nenhuma tabela referencia Produto ainda (MovimentoEstoque chega na
  // Story 3.2), então a exclusão física sempre se aplica por ora.
  await prisma.produto.delete({ where: { id } });
  revalidatePath("/produtos");
}
