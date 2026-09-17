import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "DONO";
const createMock = vi.fn(async () => ({ id: "m1" }));
const deleteMock = vi.fn(async () => ({}));

function ultimoCreateData(): Record<string, unknown> {
  const calls = createMock.mock.calls as unknown as { data: Record<string, unknown> }[][];
  return calls[0]![0]!.data;
}

vi.mock("server-only", () => ({}));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  ERRO_SEM_PERMISSAO: "Ação permitida apenas para o dono.",
  exigirSessao: async () => ({ usuarioId: "u1", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { meta: { create: createMock, delete: deleteMock } },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarMeta, excluirMeta } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

const base = { periodoInicio: "2026-09-01", periodoFim: "2026-09-30", valorAlvo: "5000" };

beforeEach(() => {
  PAPEL = "DONO";
  createMock.mockClear();
  deleteMock.mockClear();
});

describe("criarMeta", () => {
  it("BALCAO → rejeitado, nenhuma escrita", async () => {
    PAPEL = "BALCAO";
    const r = await criarMeta({ ok: false }, fd(base));
    expect(r).toEqual({ ok: false, erro: "Ação permitida apenas para o dono." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("sem profissionalId e tipo COMISSAO no formData → grava como FATURAMENTO mesmo assim", async () => {
    const r = await criarMeta({ ok: false }, fd({ ...base, tipo: "COMISSAO" }));
    expect(r).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(1);
    const data = ultimoCreateData();
    expect(data.tipo).toBe("FATURAMENTO");
    expect(data.profissionalId).toBeNull();
  });

  it("com profissionalId e tipo COMISSAO → grava normalmente", async () => {
    const r = await criarMeta(
      { ok: false },
      fd({ ...base, profissionalId: "prof1", tipo: "COMISSAO" }),
    );
    expect(r).toEqual({ ok: true });
    const data = ultimoCreateData();
    expect(data.tipo).toBe("COMISSAO");
    expect(data.profissionalId).toBe("prof1");
  });

  it("periodoInicio > periodoFim → erro, nenhuma escrita", async () => {
    const r = await criarMeta(
      { ok: false },
      fd({ periodoInicio: "2026-09-30", periodoFim: "2026-09-01", valorAlvo: "100" }),
    );
    expect(r).toEqual({ ok: false, erro: "Período inválido." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("periodoInicio vazio/inválido → erro, nenhuma escrita", async () => {
    const r = await criarMeta(
      { ok: false },
      fd({ periodoInicio: "", periodoFim: "2026-09-30", valorAlvo: "100" }),
    );
    expect(r).toEqual({ ok: false, erro: "Período inválido." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("valorAlvo <= 0 → erro, nenhuma escrita", async () => {
    const r = await criarMeta({ ok: false }, fd({ ...base, valorAlvo: "0" }));
    expect(r).toEqual({ ok: false, erro: "Informe um valor-alvo maior que zero." });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("excluirMeta", () => {
  it("BALCAO → rejeitado, nenhuma escrita", async () => {
    PAPEL = "BALCAO";
    await excluirMeta(fd({ id: "m1" }));
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("DONO → exclui normalmente", async () => {
    await excluirMeta(fd({ id: "m1" }));
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});
