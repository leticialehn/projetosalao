import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyProdutoMock = vi.fn(async () => [] as unknown[]);
const findUniqueFechamentoMock = vi.fn(async () => null as unknown);
const enviarEmailMock = vi.fn(async () => true);
const enviarWhatsappMock = vi.fn(async () => false);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    produto: { findMany: findManyProdutoMock },
    fechamentoCaixa: { findUnique: findUniqueFechamentoMock },
  },
}));

vi.mock("@/lib/email", () => ({
  enviarEmail: enviarEmailMock,
  emailAlertasOperacionais: (args: unknown) => ({
    subject: "s",
    html: JSON.stringify(args),
  }),
}));

vi.mock("@/lib/whatsapp", () => ({
  enviarWhatsapp: enviarWhatsappMock,
  normalizarTelefoneBR: (t: string) => (t ? `55${t}` : null),
}));

const { GET } = await import("./route");

function req(auth?: string) {
  return new Request("http://localhost/api/alertas-operacionais", {
    headers: auth ? { authorization: auth } : {},
  });
}

const produtoAtivoEmAlerta = {
  id: "p1",
  nome: "Shampoo",
  ativo: true,
  estoqueAtual: 1,
  estoqueMinimo: 5,
};

const produtoInativoBaixo = {
  id: "p2",
  nome: "Condicionador",
  ativo: false,
  estoqueAtual: 0,
  estoqueMinimo: 5,
};

const produtoAtivoOk = {
  id: "p3",
  nome: "Esmalte",
  ativo: true,
  estoqueAtual: 10,
  estoqueMinimo: 5,
};

beforeEach(() => {
  delete process.env.ALERTAS_CRON_SECRET;
  delete process.env.DONO_EMAIL;
  delete process.env.DONO_TELEFONE;
  delete process.env.WHATSAPP_TEMPLATE_ALERTAS_NAME;
  findManyProdutoMock.mockClear();
  findManyProdutoMock.mockImplementation(async () => []);
  findUniqueFechamentoMock.mockClear();
  findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));
  enviarEmailMock.mockClear();
  enviarEmailMock.mockImplementation(async () => true);
  enviarWhatsappMock.mockClear();
  enviarWhatsappMock.mockImplementation(async () => false);
});

describe("GET /api/alertas-operacionais", () => {
  it("sem ALERTAS_CRON_SECRET configurado → 503, nenhuma query", async () => {
    const res = await GET(req("Bearer qualquer"));
    expect(res.status).toBe(503);
    expect(findManyProdutoMock).not.toHaveBeenCalled();
  });

  it("com secret configurado e header ausente/errado → 401", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    const res1 = await GET(req());
    expect(res1.status).toBe(401);
    const res2 = await GET(req("Bearer errado"));
    expect(res2.status).toBe(401);
    expect(findManyProdutoMock).not.toHaveBeenCalled();
  });

  it("sem produto em alerta e caixa de ontem fechado → enviado: false, nenhum canal chamado", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    process.env.DONO_EMAIL = "dono@teste.com";
    findManyProdutoMock.mockImplementation(async () => [produtoAtivoOk]);
    findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      enviado: false,
      produtosEmAlerta: 0,
      caixaNaoFechado: false,
    });
    expect(enviarEmailMock).not.toHaveBeenCalled();
    expect(enviarWhatsappMock).not.toHaveBeenCalled();
  });

  it("produto ativo em alerta → enviado: true, enviarEmail chamado", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    process.env.DONO_EMAIL = "dono@teste.com";
    findManyProdutoMock.mockImplementation(async () => [produtoAtivoEmAlerta]);
    findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(body).toEqual({
      enviado: true,
      produtosEmAlerta: 1,
      caixaNaoFechado: false,
    });
    expect(enviarEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "dono@teste.com" }),
    );
  });

  it("produto abaixo do mínimo mas inativo não conta como alerta", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    process.env.DONO_EMAIL = "dono@teste.com";
    findManyProdutoMock.mockImplementation(async () => [produtoInativoBaixo]);
    findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(body).toEqual({
      enviado: false,
      produtosEmAlerta: 0,
      caixaNaoFechado: false,
    });
    expect(enviarEmailMock).not.toHaveBeenCalled();
  });

  it("caixa de ontem não fechado mesmo sem produto em alerta → enviado: true", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    process.env.DONO_EMAIL = "dono@teste.com";
    findManyProdutoMock.mockImplementation(async () => [produtoAtivoOk]);
    findUniqueFechamentoMock.mockImplementation(async () => null);

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(body).toEqual({
      enviado: true,
      produtosEmAlerta: 0,
      caixaNaoFechado: true,
    });
    expect(enviarEmailMock).toHaveBeenCalled();
  });

  it("sem DONO_EMAIL/DONO_TELEFONE configurados, mesmo com algo a reportar → 200, nenhuma chamada de canal", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    findManyProdutoMock.mockImplementation(async () => [produtoAtivoEmAlerta]);
    findUniqueFechamentoMock.mockImplementation(async () => null);

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      enviado: false,
      produtosEmAlerta: 1,
      caixaNaoFechado: true,
    });
    expect(enviarEmailMock).not.toHaveBeenCalled();
    expect(enviarWhatsappMock).not.toHaveBeenCalled();
  });

  it("consulta o FechamentoCaixa de ontem usando inicioDoDia (meia-noite local)", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    findManyProdutoMock.mockImplementation(async () => []);
    findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));

    await GET(req("Bearer segredo123"));

    expect(findUniqueFechamentoMock).toHaveBeenCalledTimes(1);
    const chamada = findUniqueFechamentoMock.mock.calls[0] as unknown as [
      { where: { data: Date } },
    ];
    const dataConsultada: Date = chamada[0].where.data;
    expect(dataConsultada.getHours()).toBe(0);
    expect(dataConsultada.getMinutes()).toBe(0);
    expect(dataConsultada.getSeconds()).toBe(0);
    expect(dataConsultada.getMilliseconds()).toBe(0);

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    expect(dataConsultada.getFullYear()).toBe(ontem.getFullYear());
    expect(dataConsultada.getMonth()).toBe(ontem.getMonth());
    expect(dataConsultada.getDate()).toBe(ontem.getDate());
  });

  it("envia também por WhatsApp quando DONO_TELEFONE está configurado", async () => {
    process.env.ALERTAS_CRON_SECRET = "segredo123";
    process.env.DONO_TELEFONE = "11999990000";
    process.env.WHATSAPP_TEMPLATE_ALERTAS_NAME = "alertas_operacionais";
    enviarWhatsappMock.mockImplementation(async () => true);
    findManyProdutoMock.mockImplementation(async () => [produtoAtivoEmAlerta]);
    findUniqueFechamentoMock.mockImplementation(async () => ({ id: "f1" }));

    const res = await GET(req("Bearer segredo123"));
    const body = await res.json();

    expect(body.enviado).toBe(true);
    expect(enviarWhatsappMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "5511999990000",
        templateName: "alertas_operacionais",
      }),
    );
  });
});
