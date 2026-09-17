import { describe, it, expect, vi } from "vitest";
import { progressoDaMeta, metasAtivasHoje } from "./metas-progresso";

function atendimento(profissionalId: string, servicoId: string, valorCobrado: number) {
  return {
    profissionalId,
    servicoId,
    valorCobrado,
    pagamentos: [] as { valor: number; formaPagamento: string }[],
  };
}

describe("progressoDaMeta", () => {
  const regras = { ana: [{ servicoId: null, percentual: 40 }] };
  const periodo = { periodoInicio: new Date(2026, 8, 1), periodoFim: new Date(2026, 8, 30) };

  it("meta de profissional FATURAMENTO → valorAtual é o total cobrado por ele no período", async () => {
    const findMany = vi.fn(async () => [atendimento("ana", "corte", 100)]);
    const db = { agendamento: { findMany } };
    const r = await progressoDaMeta(
      db as never,
      { profissionalId: "ana", tipo: "FATURAMENTO", valorAlvo: 200, ...periodo },
      regras,
      "BRUTO",
      {},
    );
    expect(r.valorAtual).toBe(100);
    expect(r.percentual).toBe(50);
  });

  it("meta de profissional COMISSAO → valorAtual é a comissão", async () => {
    const findMany = vi.fn(async () => [atendimento("ana", "corte", 100)]);
    const db = { agendamento: { findMany } };
    const r = await progressoDaMeta(
      db as never,
      { profissionalId: "ana", tipo: "COMISSAO", valorAlvo: 40, ...periodo },
      regras,
      "BRUTO",
      {},
    );
    expect(r.valorAtual).toBe(40);
    expect(r.percentual).toBe(100);
  });

  it("meta do salão → soma todos os profissionais", async () => {
    const findMany = vi.fn(async () => [
      atendimento("ana", "corte", 100),
      atendimento("carla", "corte", 50),
    ]);
    const db = { agendamento: { findMany } };
    const r = await progressoDaMeta(
      db as never,
      { profissionalId: null, tipo: "FATURAMENTO", valorAlvo: 300, ...periodo },
      { ana: [], carla: [] },
      "BRUTO",
      {},
    );
    expect(r.valorAtual).toBe(150);
    expect(r.percentual).toBe(50);
  });

  it("profissional sem atendimento no período → progresso zero, sem quebrar", async () => {
    const findMany = vi.fn(async () => []);
    const db = { agendamento: { findMany } };
    const r = await progressoDaMeta(
      db as never,
      { profissionalId: "ana", tipo: "FATURAMENTO", valorAlvo: 100, ...periodo },
      regras,
      "BRUTO",
      {},
    );
    expect(r).toEqual({ valorAtual: 0, percentual: 0 });
  });

  it("filtra a query pelo período e profissional da meta", async () => {
    const findMany = vi.fn(async () => []);
    const db = { agendamento: { findMany } };
    await progressoDaMeta(
      db as never,
      { profissionalId: "ana", tipo: "FATURAMENTO", valorAlvo: 100, ...periodo },
      regras,
      "BRUTO",
      {},
    );
    expect(findMany).toHaveBeenCalledTimes(1);
    const calls = findMany.mock.calls as unknown as { where: { profissionalId?: string } }[][];
    expect(calls[0]![0]!.where.profissionalId).toBe("ana");
  });
});

describe("metasAtivasHoje", () => {
  const hoje = new Date(2026, 8, 15);

  it("retorna só a meta cujo período inclui hoje", async () => {
    const findMany = vi.fn(async () => [
      {
        id: "m1",
        tipo: "FATURAMENTO",
        profissionalId: null,
        profissional: null,
        periodoInicio: new Date(2026, 8, 1),
        periodoFim: new Date(2026, 8, 30),
        valorAlvo: 1000,
      },
    ]);
    const db = { meta: { findMany } };
    const r = await metasAtivasHoje(db as never, hoje);
    expect(r).toHaveLength(1);
    expect(r[0]!.id).toBe("m1");
  });

  it("passa os limites de período corretos pra query (periodoFim comparado com meia-noite de hoje)", async () => {
    const findMany = vi.fn(async () => []);
    const db = { meta: { findMany } };
    await metasAtivasHoje(db as never, hoje);
    const calls = findMany.mock.calls as unknown as {
      where: { periodoInicio: { lte: Date }; periodoFim: { gte: Date } };
    }[][];
    const arg = calls[0]![0]!;
    expect(arg.where.periodoInicio.lte).toEqual(hoje);
    expect(arg.where.periodoFim.gte).toEqual(new Date(2026, 8, 15, 0, 0, 0, 0));
  });
});
