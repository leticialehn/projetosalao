import { describe, it, expect, vi, beforeEach } from "vitest";

let PAPEL = "DONO";
const createMock = vi.fn(async () => ({ id: "u1" }));
const findUniqueUsuarioMock = vi.fn(async () => null);
const findUniqueProfissionalMock = vi.fn(
  async () => ({ ativo: true, usuario: null }) as { ativo: boolean; usuario: { id: string } | null } | null,
);
const updateMock = vi.fn();
const countMock = vi.fn(async () => 0);

vi.mock("server-only", () => ({}));

vi.mock("bcryptjs", () => ({ default: { hash: async () => "hash" } }));

vi.mock("@/lib/sessao", () => ({
  PAPEL_DONO: "DONO",
  PAPEL_BALCAO: "BALCAO",
  PAPEL_PROFISSIONAL: "PROFISSIONAL",
  ERRO_SEM_PERMISSAO: "Ação permitida apenas para o dono.",
  exigirSessao: async () => ({ usuarioId: "u0", usuario: "x", papel: PAPEL }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: { findUnique: findUniqueUsuarioMock, create: createMock, update: updateMock, count: countMock },
    profissional: { findUnique: findUniqueProfissionalMock },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { criarUsuario, mudarPapelUsuario } = await import("./actions");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  PAPEL = "DONO";
  createMock.mockClear();
  updateMock.mockClear();
  findUniqueUsuarioMock.mockReset().mockResolvedValue(null);
  findUniqueProfissionalMock.mockReset().mockResolvedValue({ ativo: true, usuario: null });
});

describe("criarUsuario — papel PROFISSIONAL (Story 6.1)", () => {
  const base = { usuario: "joao", senha: "12345678", papel: "PROFISSIONAL" };

  it("sem profissionalId → erro, nenhuma escrita", async () => {
    const r = await criarUsuario({ ok: false }, fd(base));
    expect(r).toEqual({ ok: false, erro: "Selecione o profissional." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("profissional inativo → erro, nenhuma escrita", async () => {
    findUniqueProfissionalMock.mockResolvedValue({ ativo: false, usuario: null });
    const r = await criarUsuario({ ok: false }, fd({ ...base, profissionalId: "p1" }));
    expect(r).toEqual({ ok: false, erro: "Profissional inativo." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("profissional já vinculado a outro usuário → erro, nenhuma escrita", async () => {
    findUniqueProfissionalMock.mockResolvedValue({ ativo: true, usuario: { id: "u9" } });
    const r = await criarUsuario({ ok: false }, fd({ ...base, profissionalId: "p1" }));
    expect(r).toEqual({ ok: false, erro: "Este profissional já tem um login." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("profissional válido e disponível → cria com profissionalId gravado", async () => {
    const r = await criarUsuario({ ok: false }, fd({ ...base, profissionalId: "p1" }));
    expect(r).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(1);
    const calls = createMock.mock.calls as unknown as { data: Record<string, unknown> }[][];
    const data = calls[0]![0]!.data;
    expect(data.profissionalId).toBe("p1");
    expect(data.papel).toBe("PROFISSIONAL");
  });

  it("BALCAO tentando criar → rejeitado antes de qualquer validação de profissional", async () => {
    PAPEL = "BALCAO";
    const r = await criarUsuario({ ok: false }, fd({ ...base, profissionalId: "p1" }));
    expect(r).toEqual({ ok: false, erro: "Ação permitida apenas para o dono." });
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("mudarPapelUsuario — rejeita PROFISSIONAL (Story 6.1, AC 4)", () => {
  it("papel PROFISSIONAL → erro explícito, nenhuma escrita", async () => {
    const r = await mudarPapelUsuario({ ok: false }, fd({ id: "u1", papel: "PROFISSIONAL" }));
    expect(r).toEqual({ ok: false, erro: "Papel inválido." });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
