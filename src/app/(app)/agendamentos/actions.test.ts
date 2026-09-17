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
const agendamentoFindUniqueMock = vi.fn(async () => ({
  id: "ag1",
  status: "AGENDADO",
  servico: { duracaoMin: 30 },
}));
const agendamentoCreateMock = vi.fn(async () => ({ id: "ag1" }));
const agendamentoUpdateMock = vi.fn(async () => ({}));
const agendamentoDeleteMock = vi.fn(async () => ({}));

let PAPEL = "DONO";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_PROFISSIONAL: "PROFISSIONAL",
  ERRO_SOMENTE_LEITURA: "Sua conta tem acesso somente leitura à agenda.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    servico: { findUnique: servicoFindUniqueMock },
    profissional: { findUnique: profissionalFindUniqueMock },
    agendamento: {
      findFirst: agendamentoFindFirstMock,
      findUnique: agendamentoFindUniqueMock,
      create: agendamentoCreateMock,
      update: agendamentoUpdateMock,
      delete: agendamentoDeleteMock,
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarAgendamento, remarcarAgendamento, mudarStatus, excluirAgendamento } =
  await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  profissionalFindUniqueMock.mockClear();
  agendamentoCreateMock.mockClear();
  agendamentoUpdateMock.mockClear();
  agendamentoDeleteMock.mockClear();
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

describe("PROFISSIONAL — somente leitura na agenda (Story 6.2, QA fix)", () => {
  it("criarAgendamento rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    const r = await criarAgendamento({ ok: false }, fd(dadosBase));
    expect(r).toEqual({
      ok: false,
      erro: "Sua conta tem acesso somente leitura à agenda.",
    });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("remarcarAgendamento rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    const r = await remarcarAgendamento(
      { ok: false },
      fd({ id: "ag1", inicio: "2026-09-20T10:00", profissionalId: "prof1" }),
    );
    expect(r).toEqual({
      ok: false,
      erro: "Sua conta tem acesso somente leitura à agenda.",
    });
    expect(agendamentoUpdateMock).not.toHaveBeenCalled();
  });

  it("mudarStatus rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    await mudarStatus(fd({ id: "ag1", status: "CANCELADO" }));
    expect(agendamentoUpdateMock).not.toHaveBeenCalled();
  });

  it("excluirAgendamento rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    await excluirAgendamento(fd({ id: "ag1" }));
    expect(agendamentoDeleteMock).not.toHaveBeenCalled();
  });
});
