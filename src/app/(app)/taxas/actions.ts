"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  exigirSessao,
  PAPEL_DONO,
  ERRO_SEM_PERMISSAO,
} from "@/lib/sessao";
import { FORMAS_PAGAMENTO, type FormaPagamento } from "@/lib/financeiro";

export type TaxaResult = { ok: boolean; erro?: string };

const num = (v: FormDataEntryValue | null) =>
  Number(String(v ?? "").trim().replace(",", "."));

export async function salvarTaxa(
  _prev: TaxaResult,
  formData: FormData,
): Promise<TaxaResult> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };

  const forma = String(formData.get("formaPagamento") ?? "");
  if (!FORMAS_PAGAMENTO.includes(forma as FormaPagamento)) {
    return { ok: false, erro: "Forma de pagamento inválida." };
  }

  const percentual = num(formData.get("percentual"));
  const valorFixo = num(formData.get("valorFixo"));

  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    return { ok: false, erro: "Percentual deve estar entre 0 e 100." };
  }
  if (!Number.isFinite(valorFixo) || valorFixo < 0) {
    return { ok: false, erro: "Valor fixo deve ser zero ou positivo." };
  }

  await prisma.taxaPagamento.upsert({
    where: { formaPagamento: forma },
    create: { formaPagamento: forma, percentual, valorFixo },
    update: { percentual, valorFixo },
  });

  revalidatePath("/taxas");
  revalidatePath("/caixa");
  return { ok: true };
}

export async function salvarComissaoBase(
  _prev: TaxaResult,
  formData: FormData,
): Promise<TaxaResult> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };

  const comissaoBase = String(formData.get("comissaoBase") ?? "");
  if (comissaoBase !== "BRUTO" && comissaoBase !== "LIQUIDO") {
    return { ok: false, erro: "Base de comissão inválida." };
  }

  await prisma.config.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", comissaoBase },
    update: { comissaoBase },
  });

  revalidatePath("/taxas");
  revalidatePath("/comissoes");
  return { ok: true };
}
