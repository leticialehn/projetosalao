import { describe, it, expect, vi, beforeEach } from "vitest";

// Sessão controlável pelos testes
let PAPEL = "DONO";
const createMock = vi.fn(async () => ({ id: "prod1" }));
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_BALCAO: "BALCAO",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    produto: { create: createMock, update: updateMock, delete: deleteMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarProduto, atualizarProduto, excluirProduto } = await import(
  "./actions"
);

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  createMock.mockClear();
  updateMock.mockClear();
  deleteMock.mockClear();
});

describe("actions de produto — autorização por papel", () => {
  it("BALCAO → criarProduto não grava", async () => {
    PAPEL = "BALCAO";
    await criarProduto(fd({ nome: "Shampoo", estoqueMinimo: "3" }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it("BALCAO → atualizarProduto não grava", async () => {
    PAPEL = "BALCAO";
    await atualizarProduto(fd({ id: "prod1", nome: "Shampoo", estoqueMinimo: "3" }));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("BALCAO → excluirProduto não grava", async () => {
    PAPEL = "BALCAO";
    await excluirProduto(fd({ id: "prod1" }));
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("DONO → criarProduto cria com estoqueAtual implícito em 0, mesmo se enviado no formData", async () => {
    PAPEL = "DONO";
    await criarProduto(
      fd({
        nome: "Shampoo 1L",
        categoria: "Revenda",
        unidade: "un",
        estoqueMinimo: "3",
        estoqueAtual: "999",
      }),
    );
    expect(createMock).toHaveBeenCalledTimes(1);
    const dataArg = createMock.mock.calls[0][0].data;
    expect(dataArg).toEqual({
      nome: "Shampoo 1L",
      categoria: "Revenda",
      unidade: "un",
      estoqueMinimo: 3,
    });
    expect(dataArg.estoqueAtual).toBeUndefined();
  });

  it("DONO → atualizarProduto grava", async () => {
    PAPEL = "DONO";
    await atualizarProduto(
      fd({ id: "prod1", nome: "Shampoo", categoria: "Revenda", estoqueMinimo: "5" }),
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("DONO → excluirProduto grava", async () => {
    PAPEL = "DONO";
    await excluirProduto(fd({ id: "prod1" }));
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
