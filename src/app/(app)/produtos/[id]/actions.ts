"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO } from "@/lib/sessao";

export type MovimentoResult = { ok: boolean; erro?: string };

const TIPOS = ["ENTRADA", "SAIDA"] as const;

export async function registrarMovimento(
  _prev: MovimentoResult,
  formData: FormData,
): Promise<MovimentoResult> {
  const { papel } = await exigirSessao();
  const produtoId = String(formData.get("produtoId") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const quantidadeBruta = String(formData.get("quantidade") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const dataRaw = String(formData.get("data") ?? "").trim();

  if (!produtoId || !TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return { ok: false, erro: "Dados inválidos." };
  }
  // Guarda assimétrica (FR26): BALCAO registra saída, mas não entrada.
  if (tipo === "ENTRADA" && papel !== PAPEL_DONO) {
    return { ok: false, erro: "Apenas o dono pode registrar entrada de estoque." };
  }

  const quantidade = Number(quantidadeBruta.replace(",", "."));
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return { ok: false, erro: "Quantidade deve ser maior que zero." };
  }
  if (!motivo) {
    return { ok: false, erro: "Informe o motivo da movimentação." };
  }

  const data = dataRaw ? new Date(dataRaw) : new Date();
  if (Number.isNaN(data.getTime())) {
    return { ok: false, erro: "Data inválida." };
  }

  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) return { ok: false, erro: "Produto não encontrado." };

  await prisma.$transaction([
    prisma.movimentoEstoque.create({
      data: { produtoId, tipo, quantidade, motivo, data },
    }),
    prisma.produto.update({
      where: { id: produtoId },
      data: {
        estoqueAtual:
          tipo === "ENTRADA"
            ? { increment: quantidade }
            : { decrement: quantidade },
      },
    }),
  ]);

  revalidatePath(`/produtos/${produtoId}`);
  revalidatePath("/produtos");
  return { ok: true };
}
