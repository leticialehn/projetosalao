import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "DONO";
const createMock = vi.fn(async () => ({ id: "c1" }));
const updateMock = vi.fn(async () => ({}));
const deleteMock = vi.fn(async () => ({}));
const countMock = vi.fn(async () => 0);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_PROFISSIONAL: "PROFISSIONAL",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: { create: createMock, update: updateMock, delete: deleteMock },
    agendamento: { count: countMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarCliente, atualizarCliente, atualizarObservacoesCliente } =
  await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  createMock.mockClear();
  updateMock.mockClear();
});

describe("PROFISSIONAL — somente leitura em clientes (Story 6.2, QA fix)", () => {
  it("criarCliente rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    await criarCliente(fd({ nome: "Marcela" }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it("atualizarCliente rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    await atualizarCliente(fd({ id: "c1", nome: "Marcela" }));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("atualizarObservacoesCliente rejeitado, nenhuma escrita", async () => {
    PAPEL = "PROFISSIONAL";
    await atualizarObservacoesCliente({ id: "c1", observacoes: "obs" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("DONO → criarCliente prossegue normalmente", async () => {
    PAPEL = "DONO";
    await criarCliente(fd({ nome: "Marcela" }));
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
