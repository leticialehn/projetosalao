import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "PROFISSIONAL";
const findUniqueMock = vi.fn();
const txMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_PROFISSIONAL: "PROFISSIONAL",
  ERRO_SOMENTE_LEITURA: "Sua conta tem acesso somente leitura à agenda.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agendamento: { findUnique: findUniqueMock },
    $transaction: txMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { concluirAtendimento } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "PROFISSIONAL";
  findUniqueMock.mockClear();
  txMock.mockClear();
});

describe("PROFISSIONAL — somente leitura no atendimento (Story 6.2, QA fix)", () => {
  it("concluirAtendimento rejeitado antes de consultar o banco, mesmo pro próprio atendimento", async () => {
    const r = await concluirAtendimento(
      { ok: false },
      fd({ agendamentoId: "ag1", valorCobrado: "50", pagamentos: "[]" }),
    );
    expect(r).toEqual({
      ok: false,
      erro: "Sua conta tem acesso somente leitura à agenda.",
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(txMock).not.toHaveBeenCalled();
  });
});
