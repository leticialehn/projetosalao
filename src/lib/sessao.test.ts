import { describe, it, expect, vi, beforeEach } from "vitest";

// stubs dos módulos que só existem no runtime do Next
vi.mock("server-only", () => ({}));

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) =>
      cookieStore.has(n) ? { name: n, value: cookieStore.get(n) } : undefined,
    set: (n: string, v: string) => cookieStore.set(n, v),
    delete: (n: string) => cookieStore.delete(n),
  }),
}));

const redirectMock = vi.fn((url: string) => {
  throw new Error("REDIRECT:" + url);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirectMock(u) }));

process.env.SESSION_SECRET =
  "test-secret-com-mais-de-32-caracteres-aqui-ok";

const { criarSessao, exigirSessao, lerSessao } = await import("./sessao");

beforeEach(() => {
  cookieStore.clear();
  redirectMock.mockClear();
});

describe("exigirSessao", () => {
  it("sem sessão → redireciona para /login e não retorna", async () => {
    await expect(exigirSessao()).rejects.toThrow("REDIRECT:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("com sessão válida → retorna usuarioId/usuario/papel e não redireciona", async () => {
    await criarSessao({ usuarioId: "u1", usuario: "dono", papel: "DONO" });
    const s = await exigirSessao();
    expect(s.usuarioId).toBe("u1");
    expect(s.papel).toBe("DONO");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("cookie de sessão adulterado → tratado como sem sessão", async () => {
    cookieStore.set("salao_sessao", "valor-invalido-nao-selado");
    await expect(exigirSessao()).rejects.toThrow("REDIRECT:/login");
  });
});

describe("lerSessao", () => {
  it("lança se SESSION_SECRET for curto", async () => {
    const antes = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "curto";
    await expect(lerSessao()).rejects.toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = antes;
  });
});
