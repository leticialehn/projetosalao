import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizarTelefoneBR, enviarWhatsapp } from "./whatsapp";

describe("normalizarTelefoneBR", () => {
  it("11 dígitos (DDD + número, sem código do país) → prefixa 55", () => {
    expect(normalizarTelefoneBR("11999990000")).toBe("5511999990000");
  });

  it("já com 55 na frente (12 ou 13 dígitos) → mantém como está", () => {
    expect(normalizarTelefoneBR("5511999990000")).toBe("5511999990000");
    expect(normalizarTelefoneBR("+55 11 99999-0000")).toBe("5511999990000");
  });

  it("poucos dígitos (sem DDD) → null", () => {
    expect(normalizarTelefoneBR("999990000")).toBeNull();
  });

  it("string vazia → null", () => {
    expect(normalizarTelefoneBR("")).toBeNull();
  });
});

const ENV_BASE = {
  WHATSAPP_ACCESS_TOKEN: "token123",
  WHATSAPP_PHONE_NUMBER_ID: "phone123",
  WHATSAPP_TEMPLATE_NAME: "lembrete_agendamento",
};

function limparEnv() {
  for (const k of [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_TEMPLATE_NAME",
    "WHATSAPP_TEMPLATE_LANG",
  ]) {
    delete process.env[k];
  }
}

describe("enviarWhatsapp", () => {
  beforeEach(() => {
    limparEnv();
    vi.unstubAllGlobals();
  });

  it("retorna false sem chamar fetch quando falta alguma variável", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(process.env, { ...ENV_BASE, WHATSAPP_TEMPLATE_NAME: "" });

    const ok = await enviarWhatsapp({ to: "5511999990000", parametros: ["a"] });
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retorna true quando a API responde ok", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(process.env, ENV_BASE);

    const ok = await enviarWhatsapp({
      to: "5511999990000",
      parametros: ["Cliente", "Corte", "Bruno", "20/09/2026 10:00"],
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone123/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retorna false (sem lançar) quando a API responde erro", async () => {
    const fetchMock = vi.fn(
      async () => new Response("erro", { status: 400 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(process.env, ENV_BASE);

    await expect(
      enviarWhatsapp({ to: "5511999990000", parametros: ["a"] }),
    ).resolves.toBe(false);
  });

  it("retorna false (sem lançar) quando fetch rejeita (erro de rede)", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("rede indisponível");
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(process.env, ENV_BASE);

    await expect(
      enviarWhatsapp({ to: "5511999990000", parametros: ["a"] }),
    ).resolves.toBe(false);
  });
});
