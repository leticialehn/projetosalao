import { describe, it, expect, vi, beforeEach } from "vitest";

// Sessão controlável pelos testes
let PAPEL = "DONO";
const upsertMock = vi.fn();
const updateMock = vi.fn();
const findUniqueMock = vi.fn(async () => ({ id: "p1" }));
const txMock = vi.fn(async () => {});

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_BALCAO: "BALCAO",
  ERRO_SEM_PERMISSAO: "Ação permitida apenas para o dono.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profissional: { findUnique: findUniqueMock, update: updateMock },
    comissaoRegra: { upsert: upsertMock },
    $transaction: txMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { definirComissao } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  txMock.mockClear();
  upsertMock.mockClear();
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
