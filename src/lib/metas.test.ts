import { describe, it, expect } from "vitest";
import { valorAtingido, percentualAtingido } from "./metas";

describe("valorAtingido", () => {
  const agregado = {
    ana: { totalCobrado: 1000, comissao: 400 },
    carla: { totalCobrado: 500, comissao: 250 },
  };

  it("meta de profissional FATURAMENTO → lê totalCobrado", () => {
    expect(
      valorAtingido(agregado, { tipo: "FATURAMENTO", profissionalId: "ana" }),
    ).toBe(1000);
  });

  it("meta de profissional COMISSAO → lê comissao", () => {
    expect(
      valorAtingido(agregado, { tipo: "COMISSAO", profissionalId: "ana" }),
    ).toBe(400);
  });

  it("profissional sem entrada no agregado → 0", () => {
    expect(
      valorAtingido(agregado, { tipo: "FATURAMENTO", profissionalId: "rafael" }),
    ).toBe(0);
  });

  it("meta do salão (profissionalId null) → soma totalCobrado de todo mundo", () => {
    expect(
      valorAtingido(agregado, { tipo: "FATURAMENTO", profissionalId: null }),
    ).toBe(1500);
  });

  it("meta do salão com agregado vazio → 0", () => {
    expect(valorAtingido({}, { tipo: "FATURAMENTO", profissionalId: null })).toBe(0);
  });
});

describe("percentualAtingido", () => {
  it("caso normal", () => {
    expect(percentualAtingido(50, 100)).toBe(50);
  });

  it("acima de 100% → nunca passa de 100", () => {
    expect(percentualAtingido(150, 100)).toBe(100);
  });

  it("valorAlvo <= 0 → 0", () => {
    expect(percentualAtingido(50, 0)).toBe(0);
    expect(percentualAtingido(50, -10)).toBe(0);
  });

  it("arredonda pra inteiro mais próximo", () => {
    expect(percentualAtingido(33, 100)).toBe(33);
    expect(percentualAtingido(1, 3)).toBe(33);
  });
});
