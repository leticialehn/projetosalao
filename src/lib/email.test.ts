import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailMock = vi.fn(async () => ({ messageId: "x" }));
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock("nodemailer", () => ({
  default: { createTransport: createTransportMock },
}));

const { enviarEmail, emailConfirmacao } = await import("./email");

const ENV_BASE = {
  SMTP_HOST: "smtp.exemplo.com",
  SMTP_PORT: "587",
  SMTP_USER: "user",
  SMTP_PASS: "pass",
  EMAIL_FROM: "salao@exemplo.com",
};

function limparEnv() {
  for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"]) {
    delete process.env[k];
  }
}

beforeEach(() => {
  limparEnv();
  createTransportMock.mockClear();
  sendMailMock.mockClear();
});

describe("enviarEmail", () => {
  it("retorna false sem tentar enviar quando falta alguma variável SMTP", async () => {
    Object.assign(process.env, { ...ENV_BASE, SMTP_PASS: "" });
    const ok = await enviarEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(ok).toBe(false);
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it("retorna true quando o transporter envia com sucesso", async () => {
    Object.assign(process.env, ENV_BASE);
    const ok = await enviarEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" });
    expect(ok).toBe(true);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@b.com", subject: "s" }),
    );
  });

  it("retorna false (sem lançar) quando o transporter falha", async () => {
    Object.assign(process.env, ENV_BASE);
    sendMailMock.mockImplementationOnce(async () => {
      throw new Error("SMTP indisponível");
    });
    await expect(
      enviarEmail({ to: "a@b.com", subject: "s", html: "<p>x</p>" }),
    ).resolves.toBe(false);
  });
});

describe("emailConfirmacao", () => {
  it("escapa HTML no nome (vem do formulário público, não confiável)", () => {
    const { html } = emailConfirmacao({
      nome: '<img src=x onerror=alert(1)>',
      servicoNome: "Corte",
      profissionalNome: "Bruno",
      dataHoraLabel: "20/09/2026 10:00",
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
