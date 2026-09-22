import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn(async () => [] as unknown[]);
const updateMock = vi.fn(async () => ({}));
const enviarEmailMock = vi.fn(async () => true);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agendamento: { findMany: findManyMock, update: updateMock },
  },
}));

vi.mock("@/lib/email", () => ({
  enviarEmail: enviarEmailMock,
  emailLembrete: () => ({ subject: "s", html: "<p>x</p>" }),
}));

const { GET } = await import("./route");

function req(auth?: string) {
  return new Request("http://localhost/api/lembretes", {
    headers: auth ? { authorization: auth } : {},
  });
}

const agendamentoBase = {
  id: "ag1",
  inicio: new Date(Date.now() + 60 * 60000),
  cliente: { nome: "Cliente", email: "cliente@teste.com" },
  servico: { nome: "Corte" },
  profissional: { nome: "Bruno" },
};

beforeEach(() => {
  delete process.env.LEMBRETES_CRON_SECRET;
  delete process.env.LEMBRETE_ANTECEDENCIA_MIN;
  findManyMock.mockClear();
  updateMock.mockClear();
  enviarEmailMock.mockClear();
  enviarEmailMock.mockImplementation(async () => true);
  findManyMock.mockImplementation(async () => []);
});

describe("GET /api/lembretes", () => {
  it("sem LEMBRETES_CRON_SECRET configurado → 503, nenhuma query", async () => {
    const res = await GET(req("Bearer qualquer"));
    expect(res.status).toBe(503);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("com secret configurado e header ausente/errado → 401", async () => {
    process.env.LEMBRETES_CRON_SECRET = "segredo123";
    const res1 = await GET(req());
    expect(res1.status).toBe(401);
    const res2 = await GET(req("Bearer errado"));
    expect(res2.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("envia lembrete para agendamento elegível e grava lembreteEnviadoEm", async () => {
    process.env.LEMBRETES_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [agendamentoBase]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 1, pulados: 0, total: 1 });
    expect(enviarEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@teste.com" }),
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "ag1" },
      data: { lembreteEnviadoEm: expect.any(Date) },
    });
  });

  it("pula agendamento sem e-mail de cliente, sem chamar enviarEmail", async () => {
    process.env.LEMBRETES_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      { ...agendamentoBase, cliente: { nome: "Cliente", email: null } },
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 1, total: 1 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("não grava lembreteEnviadoEm quando o envio falha (continua elegível)", async () => {
    process.env.LEMBRETES_CRON_SECRET = "segredo123";
    enviarEmailMock.mockImplementation(async () => false);
    findManyMock.mockImplementation(async () => [agendamentoBase]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 1 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("consulta usa a janela de antecedência configurada", async () => {
    process.env.LEMBRETES_CRON_SECRET = "segredo123";
    process.env.LEMBRETE_ANTECEDENCIA_MIN = "60";
    await GET(req("Bearer segredo123"));
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "AGENDADO",
          lembreteEnviadoEm: null,
          inicio: expect.objectContaining({
            gt: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });
});
