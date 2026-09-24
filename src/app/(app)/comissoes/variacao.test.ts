import { describe, it, expect } from "vitest";
import { variacaoPct, formatarVariacao } from "./variacao";

describe("variacaoPct", () => {
  it("anterior 0 → null (evita divisão por zero)", () => {
    expect(variacaoPct(100, 0)).toBeNull();
    expect(variacaoPct(0, 0)).toBeNull();
  });

  it("atual maior que anterior → percentual positivo", () => {
    expect(variacaoPct(150, 100)).toBe(50);
  });

  it("atual menor que anterior → percentual negativo", () => {
    expect(variacaoPct(50, 100)).toBe(-50);
  });

  it("atual igual ao anterior → 0", () => {
    expect(variacaoPct(100, 100)).toBe(0);
  });
});

describe("formatarVariacao", () => {
  it("null vira travessão", () => {
    expect(formatarVariacao(null)).toBe("—");
  });

  it("número vira percentual com 1 casa decimal", () => {
    expect(formatarVariacao(50)).toBe("50.0%");
    expect(formatarVariacao(-33.333)).toBe("-33.3%");
  });
});
