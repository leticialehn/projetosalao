"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { exigirSessao, PAPEL_DONO, ERRO_SEM_PERMISSAO } from "@/lib/sessao";
import { inicioDoDia, inicioDoDiaSeguinte, parseDataParam } from "@/lib/datas";
import {
  resumoCaixaComTaxas,
  type ConfigTaxa,
  type FormaPagamento,
  type PagamentoInput,
} from "@/lib/financeiro";

export type CaixaResult = { ok: boolean; erro?: string };

/** Janela [de, ate) do dia informado, ou `null` se a data for inválida. */
function janelaDoDia(data: string): { de: Date; ate: Date } | null {
  const dia = parseDataParam(data);
  if (!dia) return null;
  return { de: inicioDoDia(dia), ate: inicioDoDiaSeguinte(dia) };
}

/**
 * Fecha o caixa do dia: recalcula os totais no servidor (nunca confia em
 * valores vindos do cliente), grava o `FechamentoCaixa` e marca os pagamentos
 * do dia como conferidos — tudo em uma única transação.
 */
export async function fecharCaixa(
  data: string,
  observacoes?: string,
): Promise<CaixaResult> {
  await exigirSessao();
  const janela = janelaDoDia(data);
  if (!janela) return { ok: false, erro: "Data inválida." };
  const { de, ate } = janela;

  const existente = await prisma.fechamentoCaixa.findUnique({
    where: { data: de },
  });
  if (existente) {
    return { ok: false, erro: "O caixa deste dia já está fechado." };
  }

  const [pagamentos, qtdAtendimentos, taxasDb] = await Promise.all([
    prisma.pagamento.findMany({ where: { dataHora: { gte: de, lt: ate } } }),
    prisma.agendamento.count({
      where: { status: "CONCLUIDO", inicio: { gte: de, lt: ate } },
    }),
    prisma.taxaPagamento.findMany(),
  ]);

  const taxasPorForma: Partial<Record<FormaPagamento, ConfigTaxa>> = {};
  for (const t of taxasDb) {
    taxasPorForma[t.formaPagamento as FormaPagamento] = {
      percentual: t.percentual,
      valorFixo: t.valorFixo,
    };
  }

  const { porForma, totalBruto, totalTaxas, totalLiquido, ticketMedio } =
    resumoCaixaComTaxas(
      pagamentos as PagamentoInput[],
      qtdAtendimentos,
      taxasPorForma,
    );

  const obs = observacoes?.trim();

  try {
    await prisma.$transaction([
      prisma.fechamentoCaixa.create({
        data: {
          data: de,
          totalDinheiro: porForma.DINHEIRO.bruto,
          totalPix: porForma.PIX.bruto,
          totalDebito: porForma.DEBITO.bruto,
          totalCredito: porForma.CREDITO.bruto,
          totalGeral: totalBruto,
          totalTaxas,
          totalLiquido,
          qtdAtendimentos,
          ticketMedio,
          observacoes: obs ? obs : null,
        },
      }),
      prisma.pagamento.updateMany({
        where: { dataHora: { gte: de, lt: ate } },
        data: { conferido: true },
      }),
    ]);
  } catch {
    // Corrida com outro fechamento simultâneo (unique em `data`).
    return { ok: false, erro: "O caixa deste dia já está fechado." };
  }

  revalidatePath("/caixa");
  return { ok: true };
}

/**
 * Reabre o caixa do dia: apaga o `FechamentoCaixa` e desmarca `conferido`.
 * Não recalcula nada — o próximo fechamento recalcula do zero.
 */
export async function reabrirCaixa(data: string): Promise<CaixaResult> {
  const { papel } = await exigirSessao();
  if (papel !== PAPEL_DONO) return { ok: false, erro: ERRO_SEM_PERMISSAO };
  const janela = janelaDoDia(data);
  if (!janela) return { ok: false, erro: "Data inválida." };
  const { de, ate } = janela;

  await prisma.$transaction([
    prisma.fechamentoCaixa.deleteMany({ where: { data: de } }),
    prisma.pagamento.updateMany({
      where: { dataHora: { gte: de, lt: ate } },
      data: { conferido: false },
    }),
  ]);

  revalidatePath("/caixa");
  return { ok: true };
}
