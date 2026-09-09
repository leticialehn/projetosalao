import type { PrismaClient } from "@prisma/client";

const STATUS_ATIVOS_CONFLITO = ["AGENDADO", "CONCLUIDO"];

/**
 * Verifica se o profissional já tem um agendamento sobrepondo a janela
 * [inicio, fim). `ignorarId` exclui o próprio registro (uso em remarcação).
 * Agendamentos CANCELADO / FALTOU não geram conflito.
 */
export async function temConflito(
  db: Pick<PrismaClient, "agendamento">,
  {
    profissionalId,
    inicio,
    fim,
    ignorarId,
  }: { profissionalId: string; inicio: Date; fim: Date; ignorarId?: string },
): Promise<boolean> {
  const conflito = await db.agendamento.findFirst({
    where: {
      profissionalId,
      status: { in: STATUS_ATIVOS_CONFLITO },
      inicio: { lt: fim },
      fim: { gt: inicio },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { id: true },
  });
  return conflito !== null;
}
