import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { horariosDisponiveis } from "./agenda";

function mkDb(conflitos: Set<string>): Pick<PrismaClient, "agendamento"> {
  return {
    agendamento: {
      findFirst: vi.fn(async ({ where }: { where: { profissionalId: string; inicio: { lt: Date } } }) => {
        const chave = `${where.profissionalId}-${where.inicio.lt.getHours()}:${String(where.inicio.lt.getMinutes()).padStart(2, "0")}`;
        return conflitos.has(chave) ? { id: "x" } : null;
      }),
    },
  } as unknown as Pick<PrismaClient, "agendamento">;
}

// Chave de conflito = `${profissionalId}-${HH:MM do FIM do agendamento}`,
// já que a query usa `inicio: { lt: fim }` — ver mkDb acima.
describe("horariosDisponiveis", () => {
  const data = new Date(2026, 8, 20); // 20/09/2026, sem hora

  it("respeita abertura/fechamento e duração do serviço (nenhum horário cujo fim ultrapasse 19:00)", async () => {
    const db = mkDb(new Set());
    const agora = new Date(2026, 8, 1); // bem antes, antecedência não interfere
    const horarios = await horariosDisponiveis(db, {
      data,
      duracaoMin: 60,
      profissionalIds: ["p1"],
      agora,
    });
    expect(horarios.length).toBeGreaterThan(0);
    for (const h of horarios) {
      const fim = new Date(h.inicio.getTime() + 60 * 60000);
      expect(fim.getHours()).toBeLessThanOrEqual(19);
      expect(h.inicio.getHours()).toBeGreaterThanOrEqual(8);
    }
    // Último horário possível pra 60 min: 18:00 (fim 19:00).
    expect(horarios.at(-1)?.hora).toBe("18:00");
  });

  it("não mostra horários antes da antecedência mínima (2h)", async () => {
    const db = mkDb(new Set());
    const agora = new Date(2026, 8, 20, 9, 0); // 09:00 do mesmo dia
    const horarios = await horariosDisponiveis(db, {
      data,
      duracaoMin: 30,
      profissionalIds: ["p1"],
      agora,
    });
    // Antecedência mínima => nada antes de 11:00.
    expect(horarios.every((h) => h.inicio.getTime() >= new Date(2026, 8, 20, 11, 0).getTime())).toBe(true);
    expect(horarios[0]?.hora).toBe("11:00");
  });

  it("horário com conflito pro único profissional não aparece", async () => {
    const db = mkDb(new Set(["p1-11:00"])); // conflito no slot 10:30 (fim 11:00, duração 30)
    const agora = new Date(2026, 8, 1);
    const horarios = await horariosDisponiveis(db, {
      data,
      duracaoMin: 30,
      profissionalIds: ["p1"],
      agora,
    });
    expect(horarios.some((h) => h.hora === "10:30")).toBe(false);
  });

  it('"Qualquer disponível": horário aparece se ao menos um profissional está livre', async () => {
    const db = mkDb(new Set(["p1-11:00"])); // p1 ocupado às 10:30, p2 livre
    const agora = new Date(2026, 8, 1);
    const horarios = await horariosDisponiveis(db, {
      data,
      duracaoMin: 30,
      profissionalIds: ["p1", "p2"],
      agora,
    });
    const slot = horarios.find((h) => h.hora === "10:30");
    expect(slot).toBeDefined();
    expect(slot?.profissionalId).toBe("p2");
  });
});
