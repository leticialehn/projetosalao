"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO, ERRO_SEM_PERMISSAO } from "@/lib/sessao";

export async function criarProfissional(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const nome = String(formData.get("nome") ?? "").trim();
  const especialidade = String(formData.get("especialidade") ?? "").trim() || null;
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  if (!nome) return;

  await prisma.profissional.create({ data: { nome, especialidade, telefone } });
  revalidatePath("/profissionais");
}

export async function atualizarProfissional(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
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
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };
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

  // Prisma não aceita `null` no `where` de uma unique composta (mesmo o
  // SQLite suportando `IS NULL`), então a regra geral é achada por
  // `findFirst` + create/update em vez de `upsert` pela chave composta.
  await prisma.$transaction(async (tx) => {
    const regraGeral = await tx.comissaoRegra.findFirst({
      where: { profissionalId, servicoId: null },
      select: { id: true },
    });
    if (regraGeral) {
      await tx.comissaoRegra.update({
        where: { id: regraGeral.id },
        data: { percentual },
      });
    } else {
      await tx.comissaoRegra.create({
        data: { profissionalId, servicoId: null, percentual },
      });
    }
    await tx.profissional.update({
      where: { id: profissionalId },
      data: { comissaoPercentual: percentual },
    });
  });

  revalidatePath("/profissionais");
  revalidatePath("/comissoes");
  return { ok: true };
}

/**
 * Define (ou remove, se `percentual` vier vazio) a comissão específica de um
 * serviço para um profissional. Regra geral (Story 1.3) fica intocada.
 */
export async function definirComissaoServico(
  _prev: ComissaoResult,
  formData: FormData,
): Promise<ComissaoResult> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };
  const profissionalId = String(formData.get("profissionalId") ?? "").trim();
  const servicoId = String(formData.get("servicoId") ?? "").trim();
  if (!profissionalId || !servicoId) {
    return { ok: false, erro: "Profissional ou serviço não encontrado." };
  }

  const bruto = String(formData.get("percentual") ?? "").trim();

  // Campo vazio = remove a regra específica (volta a usar a geral).
  if (bruto === "") {
    await prisma.comissaoRegra.deleteMany({
      where: { profissionalId, servicoId },
    });
    revalidatePath("/profissionais");
    revalidatePath("/comissoes");
    return { ok: true };
  }

  const percentual = Number(bruto.replace(",", "."));
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { ok: false, erro: "Percentual deve estar entre 0 e 100." };
  }

  const [profissional, servico] = await Promise.all([
    prisma.profissional.findUnique({ where: { id: profissionalId }, select: { id: true } }),
    prisma.servico.findUnique({ where: { id: servicoId }, select: { id: true } }),
  ]);
  if (!profissional || !servico) {
    return { ok: false, erro: "Profissional ou serviço não encontrado." };
  }

  await prisma.comissaoRegra.upsert({
    where: { profissionalId_servicoId: { profissionalId, servicoId } },
    create: { profissionalId, servicoId, percentual },
    update: { percentual },
  });

  revalidatePath("/profissionais");
  revalidatePath("/comissoes");
  return { ok: true };
}

export async function excluirProfissional(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id"));
  const emUso = await prisma.agendamento.count({ where: { profissionalId: id } });
  if (emUso > 0) {
    await prisma.profissional.update({ where: { id }, data: { ativo: false } });
  } else {
    await prisma.profissional.delete({ where: { id } });
  }
  revalidatePath("/profissionais");
}
