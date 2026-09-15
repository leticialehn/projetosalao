import { describe, it, expect, vi, beforeEach } from "vitest";

const servicoFindUniqueMock = vi.fn(async () => ({
  id: "srv1",
  duracaoMin: 30,
}));
const profissionalFindUniqueMock = vi.fn(async () => ({
  id: "prof1",
  servicos: [] as { id: string }[],
}));
const agendamentoFindFirstMock = vi.fn(async () => null);
const agendamentoCreateMock = vi.fn(async () => ({ id: "ag1" }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: "DONO" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    servico: { findUnique: servicoFindUniqueMock },
    profissional: { findUnique: profissionalFindUniqueMock },
    agendamento: {
      findFirst: agendamentoFindFirstMock,
      create: agendamentoCreateMock,
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarAgendamento } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  profissionalFindUniqueMock.mockClear();
  agendamentoCreateMock.mockClear();
  profissionalFindUniqueMock.mockImplementation(async () => ({
    id: "prof1",
    servicos: [],
  }));
});

const dadosBase = {
  clienteId: "cli1",
  profissionalId: "prof1",
  servicoId: "srv1",
  inicio: "2026-09-20T10:00",
};

describe("criarAgendamento — vínculo profissional/serviço (Story 5.1)", () => {
  it("profissional SEM nenhum serviço vinculado → cria normalmente (retrocompatibilidade)", async () => {
    profissionalFindUniqueMock.mockImplementation(async () => ({
      id: "prof1",
      servicos: [],
    }));
    const r = await criarAgendamento({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
    expect(agendamentoCreateMock).toHaveBeenCalledTimes(1);
  });

  it("profissional vinculado só a outro serviço → rejeitado", async () => {
    profissionalFindUniqueMock.mockImplementation(async () => ({
      id: "prof1",
      servicos: [{ id: "srv-outro" }],
    }));
    const r = await criarAgendamento({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: false, erro: "Este profissional não atende esse serviço." });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("profissional vinculado ao serviço escolhido → cria normalmente", async () => {
    profissionalFindUniqueMock.mockImplementation(async () => ({
      id: "prof1",
      servicos: [{ id: "srv1" }],
    }));
    const r = await criarAgendamento({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
    expect(agendamentoCreateMock).toHaveBeenCalledTimes(1);
  });
});
