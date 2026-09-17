import { describe, it, expect, vi, beforeEach } from "vitest";

// Sessão controlável pelos testes
let PAPEL = "DONO";
const upsertMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn(async () => ({ id: "p1" }));
const txMock = vi.fn(async () => {});
const deleteMock = vi.fn();
let agendamentoCount = 0;
let usuarioCount = 0;
const agendamentoCountMock = vi.fn(async () => agendamentoCount);
const usuarioCountMock = vi.fn(async () => usuarioCount);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_BALCAO: "BALCAO",
  ERRO_SEM_PERMISSAO: "Ação permitida apenas para o dono.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profissional: { findUnique: findUniqueMock, update: updateMock, delete: deleteMock },
    comissaoRegra: { upsert: upsertMock },
    agendamento: { count: agendamentoCountMock },
    usuario: { count: usuarioCountMock },
    $transaction: txMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { definirComissao, excluirProfissional } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  agendamentoCount = 0;
  usuarioCount = 0;
  txMock.mockClear();
  upsertMock.mockClear();
  deleteMock.mockClear();
  updateMock.mockClear();
});

describe("definirComissao — autorização por papel", () => {
  it("BALCAO → rejeitado com mensagem e sem gravar", async () => {
    PAPEL = "BALCAO";
    const r = await definirComissao(
      { ok: false },
      fd({ profissionalId: "p1", percentual: "40" }),
    );
    expect(r).toEqual({ ok: false, erro: "Ação permitida apenas para o dono." });
    expect(txMock).not.toHaveBeenCalled();
  });

  it("DONO → prossegue (chega a gravar a transação)", async () => {
    PAPEL = "DONO";
    const r = await definirComissao(
      { ok: false },
      fd({ profissionalId: "p1", percentual: "40" }),
    );
    expect(r).toEqual({ ok: true });
    expect(txMock).toHaveBeenCalledTimes(1);
  });
});

describe("excluirProfissional — proteção de login vinculado (Story 6.1)", () => {
  it("sem agendamento e sem usuário vinculado → exclui fisicamente", async () => {
    agendamentoCount = 0;
    usuarioCount = 0;
    await excluirProfissional(fd({ id: "p1" }));
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("com usuário vinculado, mesmo sem agendamento → inativa em vez de excluir", async () => {
    agendamentoCount = 0;
    usuarioCount = 1;
    await excluirProfissional(fd({ id: "p1" }));
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { ativo: false },
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("com agendamento → inativa (comportamento já existente, sem regressão)", async () => {
    agendamentoCount = 1;
    usuarioCount = 0;
    await excluirProfissional(fd({ id: "p1" }));
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { ativo: false },
    });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
