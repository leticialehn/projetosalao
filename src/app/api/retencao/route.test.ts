import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn(async () => [] as unknown[]);
const updateMock = vi.fn(async () => ({}));
const enviarEmailMock = vi.fn(async () => true);
const enviarWhatsappMock = vi.fn(async () => false);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: { findMany: findManyMock, update: updateMock },
  },
}));

vi.mock("@/lib/email", () => ({
  enviarEmail: enviarEmailMock,
  emailRetencao: () => ({ subject: "s", html: "<p>x</p>" }),
}));

vi.mock("@/lib/whatsapp", () => ({
  enviarWhatsapp: enviarWhatsappMock,
  normalizarTelefoneBR: (t: string) => (t ? `55${t}` : null),
}));

const { GET } = await import("./route");

function req(auth?: string) {
  return new Request("http://localhost/api/retencao", {
    headers: auth ? { authorization: auth } : {},
  });
}

const DIA = 24 * 60 * 60000;

function clienteBase(overrides: Record<string, unknown> = {}) {
  return {
    id: "cli1",
    nome: "Cliente",
    email: "cliente@teste.com",
    telefone: null,
    ultimoLembreteRetencaoEm: null,
    agendamentos: [
      { status: "CONCLUIDO", inicio: new Date(Date.now() - 50 * DIA) },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  delete process.env.RETENCAO_CRON_SECRET;
  delete process.env.RETENCAO_DIAS_INATIVIDADE;
  findManyMock.mockClear();
  updateMock.mockClear();
  enviarEmailMock.mockClear();
  enviarEmailMock.mockImplementation(async () => true);
  enviarWhatsappMock.mockClear();
  enviarWhatsappMock.mockImplementation(async () => false);
  findManyMock.mockImplementation(async () => []);
});

describe("GET /api/retencao", () => {
  it("sem RETENCAO_CRON_SECRET configurado → 503, nenhuma query", async () => {
    const res = await GET(req("Bearer qualquer"));
    expect(res.status).toBe(503);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("com secret configurado e header ausente/errado → 401", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    const res1 = await GET(req());
    expect(res1.status).toBe(401);
    const res2 = await GET(req("Bearer errado"));
    expect(res2.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("cliente inativo há mais de 45 dias, sem agendamento futuro, nunca notificado → elegível", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [clienteBase()]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 1, pulados: 0, total: 1 });
    expect(enviarEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@teste.com" }),
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "cli1" },
      data: { ultimoLembreteRetencaoEm: expect.any(Date) },
    });
  });

  it("cliente com agendamento AGENDADO futuro, mesmo com última visita antiga → não elegível", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      clienteBase({
        agendamentos: [
          { status: "CONCLUIDO", inicio: new Date(Date.now() - 50 * DIA) },
          { status: "AGENDADO", inicio: new Date(Date.now() + 2 * DIA) },
        ],
      }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 0 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
    expect(enviarWhatsappMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("cliente sem nenhum CONCLUIDO → não elegível", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      clienteBase({ agendamentos: [] }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 0 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
  });

  it("cliente já notificado depois da última visita → não elegível (evita spam)", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      clienteBase({
        ultimoLembreteRetencaoEm: new Date(Date.now() - 40 * DIA), // depois da visita (-50d)
      }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 0 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
  });

  it("cliente que voltou e sumiu de novo desde o último lembrete → elegível de novo (novo ciclo)", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      clienteBase({
        // lembrete antigo, ANTES da visita mais recente concluída (que já passou do prazo)
        ultimoLembreteRetencaoEm: new Date(Date.now() - 100 * DIA),
        agendamentos: [{ status: "CONCLUIDO", inicio: new Date(Date.now() - 50 * DIA) }],
      }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 1, pulados: 0, total: 1 });
    expect(enviarEmailMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "cli1" },
      data: { ultimoLembreteRetencaoEm: expect.any(Date) },
    });
  });

  it("cliente elegível sem e-mail nem telefone → conta em pulados, nenhum canal chamado", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    findManyMock.mockImplementation(async () => [
      clienteBase({ email: null, telefone: null }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 1, total: 1 });
    expect(enviarEmailMock).not.toHaveBeenCalled();
    expect(enviarWhatsappMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("e-mail falha mas WhatsApp funciona → ainda conta como enviado, usa templateName de retenção", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    process.env.WHATSAPP_TEMPLATE_RETENCAO_NAME = "retencao_template";
    enviarEmailMock.mockImplementation(async () => false);
    enviarWhatsappMock.mockImplementation(async () => true);
    findManyMock.mockImplementation(async () => [
      clienteBase({ telefone: "11999990000" }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 1, pulados: 0, total: 1 });
    expect(enviarWhatsappMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "5511999990000",
        parametros: ["Cliente"],
        templateName: "retencao_template",
      }),
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "cli1" },
      data: { ultimoLembreteRetencaoEm: expect.any(Date) },
    });
    delete process.env.WHATSAPP_TEMPLATE_RETENCAO_NAME;
  });

  it("nenhum canal envia com sucesso → não grava ultimoLembreteRetencaoEm (continua elegível)", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    enviarEmailMock.mockImplementation(async () => false);
    findManyMock.mockImplementation(async () => [clienteBase()]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 1 });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("respeita RETENCAO_DIAS_INATIVIDADE customizado", async () => {
    process.env.RETENCAO_CRON_SECRET = "segredo123";
    process.env.RETENCAO_DIAS_INATIVIDADE = "10";
    findManyMock.mockImplementation(async () => [
      clienteBase({
        agendamentos: [{ status: "CONCLUIDO", inicio: new Date(Date.now() - 5 * DIA) }],
      }),
    ]);
    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();
    // 5 dias de inatividade < limite de 10 → ainda não elegível
    expect(body).toEqual({ enviados: 0, pulados: 0, total: 0 });
  });
});
