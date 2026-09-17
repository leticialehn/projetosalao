import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "PROFISSIONAL";
const fechamentoFindUniqueMock = vi.fn();
const txMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_PROFISSIONAL: "PROFISSIONAL",
  ERRO_SEM_PERMISSAO: "Ação permitida apenas para o dono.",
  ERRO_SOMENTE_LEITURA: "Sua conta tem acesso somente leitura à agenda.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fechamentoCaixa: { findUnique: fechamentoFindUniqueMock },
    $transaction: txMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { fecharCaixa, reabrirCaixa } = await import("./actions");

beforeEach(() => {
  PAPEL = "PROFISSIONAL";
  fechamentoFindUniqueMock.mockClear();
  txMock.mockClear();
});

describe("PROFISSIONAL — somente leitura no caixa (Story 6.2, QA fix)", () => {
  it("fecharCaixa rejeitado antes de consultar o banco", async () => {
    const r = await fecharCaixa("2026-09-20");
    expect(r).toEqual({
      ok: false,
      erro: "Sua conta tem acesso somente leitura à agenda.",
    });
    expect(fechamentoFindUniqueMock).not.toHaveBeenCalled();
    expect(txMock).not.toHaveBeenCalled();
  });

  it("reabrirCaixa (já restrito a DONO) continua rejeitando PROFISSIONAL", async () => {
    const r = await reabrirCaixa("2026-09-20");
    expect(r).toEqual({ ok: false, erro: "Ação permitida apenas para o dono." });
    expect(txMock).not.toHaveBeenCalled();
  });
});
