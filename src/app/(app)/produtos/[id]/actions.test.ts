import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "DONO";
const findUniqueMock = vi.fn(async () => ({ id: "prod1", nome: "Shampoo" }));
const transactionMock = vi.fn(async () => []);
const movimentoCreateArgs: unknown[] = [];
const produtoUpdateArgs: unknown[] = [];

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_BALCAO: "BALCAO",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    produto: {
      findUnique: findUniqueMock,
      update: (args: unknown) => {
        produtoUpdateArgs.push(args);
        return { __op: "produto.update", args };
      },
    },
    movimentoEstoque: {
      create: (args: unknown) => {
        movimentoCreateArgs.push(args);
        return { __op: "movimentoEstoque.create", args };
      },
    },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { registrarMovimento } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  transactionMock.mockClear();
  movimentoCreateArgs.length = 0;
  produtoUpdateArgs.length = 0;
});

const base = {
  produtoId: "prod1",
  quantidade: "5",
  motivo: "Compra fornecedor",
  data: "2026-09-15T10:00",
};

describe("registrarMovimento — guarda assimétrica e atomicidade (Story 5.1... 3.2)", () => {
  it("BALCAO tentando ENTRADA → rejeitado, sem transação", async () => {
    PAPEL = "BALCAO";
    const r = await registrarMovimento({ ok: false }, fd({ ...base, tipo: "ENTRADA" }));
    expect(r).toEqual({
      ok: false,
      erro: "Apenas o dono pode registrar entrada de estoque.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("BALCAO registrando SAIDA → grava normalmente", async () => {
    PAPEL = "BALCAO";
    const r = await registrarMovimento({ ok: false }, fd({ ...base, tipo: "SAIDA" }));
    expect(r).toEqual({ ok: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("DONO registrando ENTRADA de 5 → increment de 5 no estoqueAtual", async () => {
    PAPEL = "DONO";
    const r = await registrarMovimento({ ok: false }, fd({ ...base, tipo: "ENTRADA" }));
    expect(r).toEqual({ ok: true });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(produtoUpdateArgs[0]).toMatchObject({
      where: { id: "prod1" },
      data: { estoqueAtual: { increment: 5 } },
    });
    expect(movimentoCreateArgs[0]).toMatchObject({
      data: { produtoId: "prod1", tipo: "ENTRADA", quantidade: 5 },
    });
  });

  it("DONO registrando SAIDA de 3 → decrement de 3 no estoqueAtual", async () => {
    PAPEL = "DONO";
    const r = await registrarMovimento(
      { ok: false },
      fd({ ...base, tipo: "SAIDA", quantidade: "3" }),
    );
    expect(r).toEqual({ ok: true });
    expect(produtoUpdateArgs[0]).toMatchObject({
      where: { id: "prod1" },
      data: { estoqueAtual: { decrement: 3 } },
    });
  });
});
