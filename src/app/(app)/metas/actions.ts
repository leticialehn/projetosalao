"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  exigirSessao,
  PAPEL_DONO,
  ERRO_SEM_PERMISSAO,
} from "@/lib/sessao";
import { parseDataParam } from "@/lib/datas";

export type MetaResult = { ok: boolean; erro?: string };

const TIPOS_PROFISSIONAL = ["FATURAMENTO", "COMISSAO"];

export async function criarMeta(
  _prev: MetaResult,
  formData: FormData,
): Promise<MetaResult> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };

  const profissionalId =
    String(formData.get("profissionalId") ?? "").trim() || null;

  const periodoInicio = parseDataParam(
    String(formData.get("periodoInicio") ?? ""),
  );
  const periodoFim = parseDataParam(String(formData.get("periodoFim") ?? ""));
  if (!periodoInicio || !periodoFim) {
    return { ok: false, erro: "Período inválido." };
  }
  if (periodoInicio.getTime() > periodoFim.getTime()) {
    return { ok: false, erro: "Período inválido." };
  }

  const valorAlvo = Number(
    String(formData.get("valorAlvo") ?? "").trim().replace(",", "."),
  );
  if (!Number.isFinite(valorAlvo) || valorAlvo <= 0) {
    return { ok: false, erro: "Informe um valor-alvo maior que zero." };
  }

  // Meta do salão (sem profissional) só existe como Faturamento — o salão
  // não recebe comissão. O tipo do formData nunca é lido nesse caso.
  let tipo: string;
  if (!profissionalId) {
    tipo = "FATURAMENTO";
  } else {
    tipo = String(formData.get("tipo") ?? "");
    if (!TIPOS_PROFISSIONAL.includes(tipo)) {
      return { ok: false, erro: "Tipo inválido." };
    }
  }

  await prisma.meta.create({
    data: { tipo, profissionalId, periodoInicio, periodoFim, valorAlvo },
  });
  revalidatePath("/metas");
  return { ok: true };
}

export async function excluirMeta(formData: FormData) {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.meta.delete({ where: { id } });
  revalidatePath("/metas");
}
