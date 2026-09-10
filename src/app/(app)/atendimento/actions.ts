"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  reais,
  somarPagamentos,
  FORMAS_PAGAMENTO,
  type FormaPagamento,
  type PagamentoInput,
} from "@/lib/financeiro";

export type ConcluirResult = { ok: boolean; erro?: string };

function parsePagamentos(raw: string): PagamentoInput[] | null {
  let dados: unknown;
  try {
    dados = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(dados)) return null;

  const out: PagamentoInput[] = [];
  for (const item of dados) {
    if (typeof item !== "object" || item === null) return null;
    const valor = Number((item as { valor?: unknown }).valor);
    const forma = String((item as { formaPagamento?: unknown }).formaPagamento);
    if (!Number.isFinite(valor) || valor <= 0) return null;
    if (!FORMAS_PAGAMENTO.includes(forma as FormaPagamento)) return null;
    out.push({ valor: reais(valor), formaPagamento: forma as FormaPagamento });
  }
  return out;
}

export async function concluirAtendimento(
  _prev: ConcluirResult,
  formData: FormData,
): Promise<ConcluirResult> {
  const agendamentoId = String(formData.get("agendamentoId") ?? "");
  const cortesia = formData.get("cortesia") === "on";
  const valorCobradoRaw = Number(
    String(formData.get("valorCobrado") ?? "").replace(",", "."),
  );
  const pagamentos = parsePagamentos(String(formData.get("pagamentos") ?? "[]"));

  if (!agendamentoId) {
    return { ok: false, erro: "Agendamento não informado." };
  }
  if (pagamentos === null) {
    return { ok: false, erro: "Dados de pagamento inválidos." };
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { servico: true },
  });
  if (!agendamento) {
    return { ok: false, erro: "Agendamento não encontrado." };
  }
  if (agendamento.status !== "AGENDADO") {
    return {
      ok: false,
      erro: "Este atendimento já foi concluído ou cancelado.",
    };
  }

  let valorCobrado: number;
  if (cortesia) {
    if (pagamentos.length > 0) {
      return {
        ok: false,
        erro: "Cortesia não aceita linhas de pagamento.",
      };
    }
    valorCobrado = 0;
  } else {
    valorCobrado = reais(valorCobradoRaw);
    if (!Number.isFinite(valorCobrado) || valorCobrado <= 0) {
      return {
        ok: false,
        erro: "Informe um valor cobrado válido ou use a opção cortesia.",
      };
    }
    if (reais(somarPagamentos(pagamentos)) !== valorCobrado) {
      return {
        ok: false,
        erro: "A soma dos pagamentos não confere com o valor cobrado.",
      };
    }
  }

  await prisma.$transaction([
    prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: "CONCLUIDO", valorCobrado },
    }),
    ...(pagamentos.length > 0
      ? [
          prisma.pagamento.createMany({
            data: pagamentos.map((p) => ({
              agendamentoId,
              valor: p.valor,
              formaPagamento: p.formaPagamento,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  revalidatePath("/painel");
  revalidatePath("/agendamentos");
  revalidatePath("/caixa");
  return { ok: true };
}
