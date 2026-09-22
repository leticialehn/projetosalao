import type { PrismaClient } from "@prisma/client";

const STATUS_ATIVOS_CONFLITO = ["AGENDADO", "CONCLUIDO"];

// Grade fixa de horário de funcionamento (Story 8.1) — não existe hoje
// nenhuma tela/config de horário de funcionamento no sistema; fixado em
// código como decisão de MVP (Article IV — No Invention). Se o salão
// funcionar fora desta janela, os horários mostrados no agendamento
// público ficam incorretos até uma story futura tornar isso configurável.
export const HORA_ABERTURA = 8;
export const HORA_FECHAMENTO = 19;
export const GRANULARIDADE_MIN = 30;
export const ANTECEDENCIA_MIN_MIN = 120;

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

/**
 * Calcula os horários livres de um dia numa grade fixa (HORA_ABERTURA..
 * HORA_FECHAMENTO, a cada GRANULARIDADE_MIN minutos), respeitando a duração
 * do serviço, a antecedência mínima a partir de agora, e o conflito de cada
 * profissional elegível (temConflito). Para cada horário, retorna o primeiro
 * profissional de `profissionalIds` que está livre — é isso que permite a
 * opção "Qualquer disponível" já saber qual profissional concreto propor.
 */
export async function horariosDisponiveis(
  db: Pick<PrismaClient, "agendamento">,
  {
    data,
    duracaoMin,
    profissionalIds,
    agora = new Date(),
  }: {
    data: Date;
    duracaoMin: number;
    profissionalIds: string[];
    agora?: Date;
  },
): Promise<{ hora: string; inicio: Date; profissionalId: string }[]> {
  const resultado: { hora: string; inicio: Date; profissionalId: string }[] = [];
  const limiteAntecedencia = new Date(agora.getTime() + ANTECEDENCIA_MIN_MIN * 60000);

  const inicioDoDia = new Date(data);
  inicioDoDia.setHours(HORA_ABERTURA, 0, 0, 0);
  const fechamento = new Date(data);
  fechamento.setHours(HORA_FECHAMENTO, 0, 0, 0);

  for (
    let inicio = inicioDoDia;
    inicio.getTime() + duracaoMin * 60000 <= fechamento.getTime();
    inicio = new Date(inicio.getTime() + GRANULARIDADE_MIN * 60000)
  ) {
    if (inicio < limiteAntecedencia) continue;
    const fim = new Date(inicio.getTime() + duracaoMin * 60000);

    for (const profissionalId of profissionalIds) {
      if (!(await temConflito(db, { profissionalId, inicio, fim }))) {
        resultado.push({
          hora: `${String(inicio.getHours()).padStart(2, "0")}:${String(inicio.getMinutes()).padStart(2, "0")}`,
          inicio,
          profissionalId,
        });
        break;
      }
    }
  }

  return resultado;
}
