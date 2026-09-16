import { describe, it, expect } from "vitest";
import { emAlerta } from "./estoque";

describe("emAlerta", () => {
  it("ativo com estoqueAtual < estoqueMinimo → true", () => {
    expect(
      emAlerta({ ativo: true, estoqueAtual: 2, estoqueMinimo: 5 }),
    ).toBe(true);
  });

  it("inativo com estoqueAtual < estoqueMinimo → false (produto inativo nunca alerta)", () => {
    expect(
      emAlerta({ ativo: false, estoqueAtual: 2, estoqueMinimo: 5 }),
    ).toBe(false);
  });

  it("estoqueAtual >= estoqueMinimo → false", () => {
    expect(
      emAlerta({ ativo: true, estoqueAtual: 5, estoqueMinimo: 5 }),
    ).toBe(false);
    expect(
      emAlerta({ ativo: true, estoqueAtual: 10, estoqueMinimo: 5 }),
    ).toBe(false);
  });

  it("estoqueMinimo 0 e estoqueAtual 0 → false", () => {
    expect(
      emAlerta({ ativo: true, estoqueAtual: 0, estoqueMinimo: 0 }),
    ).toBe(false);
  });

  it("estoqueMinimo 0 e estoqueAtual negativo (Story 3.2 permite) → true", () => {
    expect(
      emAlerta({ ativo: true, estoqueAtual: -1, estoqueMinimo: 0 }),
    ).toBe(true);
  });
});
