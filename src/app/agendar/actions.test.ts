import { describe, it, expect, vi, beforeEach } from "vitest";
import { _resetTudo } from "@/lib/rate-limit";

const servicoFindUniqueMock = vi.fn(async () => ({
  id: "srv1",
  duracaoMin: 30,
  ativo: true,
}));
const profissionalFindUniqueMock = vi.fn(async () => ({
  id: "prof1",
  ativo: true,
  servicos: [] as { id: string }[],
}));
const agendamentoFindFirstMock = vi.fn(async (): Promise<{ id: string } | null> => null);
const agendamentoCreateMock = vi.fn(async () => ({ id: "ag1" }));
const clienteFindFirstMock = vi.fn(async () => null as { id: string; email?: string | null } | null);
const clienteCreateMock = vi.fn(async () => ({ id: "cli-novo", email: "cliente@teste.com" }));
const enviarEmailMock = vi.fn(async () => true);

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "1.2.3.4"]]),
}));

vi.mock("@/lib/email", () => ({
  enviarEmail: enviarEmailMock,
  emailConfirmacao: () => ({ subject: "s", html: "<p>x</p>" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    servico: { findUnique: servicoFindUniqueMock },
    profissional: { findUnique: profissionalFindUniqueMock },
    agendamento: {
      findFirst: agendamentoFindFirstMock,
      create: agendamentoCreateMock,
    },
    cliente: { findFirst: clienteFindFirstMock, create: clienteCreateMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarAgendamentoPublico } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const dadosBase = {
  servicoId: "srv1",
  profissionalId: "prof1",
  inicio: "2026-09-20T10:00:00.000Z",
  nome: "Cliente Teste",
  telefone: "11999990000",
  email: "cliente@teste.com",
};

beforeEach(() => {
  _resetTudo();
  servicoFindUniqueMock.mockClear();
  profissionalFindUniqueMock.mockClear();
  agendamentoFindFirstMock.mockClear();
  agendamentoCreateMock.mockClear();
  clienteFindFirstMock.mockClear();
  clienteCreateMock.mockClear();
  enviarEmailMock.mockClear();
  enviarEmailMock.mockImplementation(async () => true);
  profissionalFindUniqueMock.mockImplementation(async () => ({
    id: "prof1",
    ativo: true,
    servicos: [],
  }));
  servicoFindUniqueMock.mockImplementation(async () => ({
    id: "srv1",
    duracaoMin: 30,
    ativo: true,
  }));
  agendamentoFindFirstMock.mockImplementation(async () => null);
  clienteFindFirstMock.mockImplementation(async () => null);
});

describe("criarAgendamentoPublico", () => {
  it("cria cliente novo quando telefone não bate com nenhum existente", async () => {
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
    expect(clienteCreateMock).toHaveBeenCalledTimes(1);
    expect(agendamentoCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clienteId: "cli-novo" }),
      }),
    );
  });

  it("reusa cliente existente quando telefone bate", async () => {
    clienteFindFirstMock.mockImplementation(async () => ({ id: "cli-existente" }));
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
    expect(clienteCreateMock).not.toHaveBeenCalled();
    expect(agendamentoCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clienteId: "cli-existente" }),
      }),
    );
  });

  it("rejeita quando o profissional não atende o serviço", async () => {
    profissionalFindUniqueMock.mockImplementation(async () => ({
      id: "prof1",
      ativo: true,
      servicos: [{ id: "srv-outro" }],
    }));
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: false, erro: "Este profissional não atende esse serviço." });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("rejeita profissional inativo, mesmo com id válido (link obsoleto/adulterado)", async () => {
    profissionalFindUniqueMock.mockImplementation(async () => ({
      id: "prof1",
      ativo: false,
      servicos: [],
    }));
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: false, erro: "Profissional não encontrado." });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("rejeita serviço inativo, mesmo com id válido (link obsoleto/adulterado)", async () => {
    servicoFindUniqueMock.mockImplementation(async () => ({
      id: "srv1",
      duracaoMin: 30,
      ativo: false,
    }));
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: false, erro: "Serviço não encontrado." });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("rejeita quando o horário está em conflito na revalidação", async () => {
    agendamentoFindFirstMock.mockImplementation(async () => ({ id: "outro" }));
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({
      ok: false,
      erro: "Esse horário acabou de ser ocupado. Escolha outro horário.",
    });
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });

  it("chama enviarEmail com o e-mail do formulário quando informado", async () => {
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
    expect(enviarEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@teste.com" }),
    );
  });

  it("ainda retorna ok:true quando enviarEmail falha (best-effort, não bloqueia)", async () => {
    enviarEmailMock.mockImplementation(async () => false);
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r).toEqual({ ok: true });
  });

  it("rate limit bloqueia após várias falhas seguidas da mesma chave", async () => {
    const dadosInvalidos = { ...dadosBase, nome: "" };
    for (let i = 0; i < 5; i++) {
      await criarAgendamentoPublico({ ok: false }, fd(dadosInvalidos));
    }
    const r = await criarAgendamentoPublico({ ok: false }, fd(dadosBase));
    expect(r.ok).toBe(false);
    expect(r.erro).toMatch(/Muitas tentativas/);
    expect(agendamentoCreateMock).not.toHaveBeenCalled();
  });
});
