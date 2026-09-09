import { describe, it, expect } from "vitest";
import {
  inicioDoDia,
  fimDoDia,
  inicioDoDiaSeguinte,
  intervaloMes,
  parseDataParam,
  inicioDaSemana,
  toDateParam,
} from "./datas";

describe("inicioDoDia / fimDoDia / inicioDoDiaSeguinte", () => {
  const d = new Date(2026, 2, 15, 14, 30, 45, 123); // 15/03/2026 14:30
  it("inicioDoDia zera a hora", () => {
    const r = inicioDoDia(d);
    expect(r.getHours()).toBe(0);
    expect(r.getMinutes()).toBe(0);
    expect(r.getDate()).toBe(15);
  });
  it("fimDoDia é 23:59:59.999", () => {
    const r = fimDoDia(d);
    expect(r.getHours()).toBe(23);
    expect(r.getMilliseconds()).toBe(999);
    expect(r.getDate()).toBe(15);
  });
  it("inicioDoDiaSeguinte avança um dia à meia-noite", () => {
    const r = inicioDoDiaSeguinte(d);
    expect(r.getDate()).toBe(16);
    expect(r.getHours()).toBe(0);
  });
  it("não muta a entrada", () => {
    inicioDoDia(d);
    expect(d.getHours()).toBe(14);
  });
});

describe("intervaloMes", () => {
  it("fevereiro de ano não bissexto termina no dia 28", () => {
    const { de, ate } = intervaloMes(new Date(2026, 1, 10));
    expect(de.getDate()).toBe(1);
    expect(de.getMonth()).toBe(1);
    expect(ate.getDate()).toBe(28);
  });
  it("abril termina no dia 30", () => {
    const { ate } = intervaloMes(new Date(2026, 3, 10));
    expect(ate.getDate()).toBe(30);
  });
  it("janeiro termina no dia 31", () => {
    const { ate } = intervaloMes(new Date(2026, 0, 10));
    expect(ate.getDate()).toBe(31);
  });
});

describe("parseDataParam", () => {
  it("converte YYYY-MM-DD", () => {
    const r = parseDataParam("2026-03-15");
    expect(r?.getFullYear()).toBe(2026);
    expect(r?.getMonth()).toBe(2);
    expect(r?.getDate()).toBe(15);
    expect(r?.getHours()).toBe(0);
  });
  it("nulo/vazio → null", () => {
    expect(parseDataParam(null)).toBeNull();
    expect(parseDataParam("")).toBeNull();
    expect(parseDataParam("   ")).toBeNull();
  });
  it("formato inválido → null", () => {
    expect(parseDataParam("15/03/2026")).toBeNull();
    expect(parseDataParam("2026-3-5")).toBeNull();
    expect(parseDataParam("abc")).toBeNull();
  });
  it("data impossível → null", () => {
    expect(parseDataParam("2026-02-30")).toBeNull();
    expect(parseDataParam("2026-13-01")).toBeNull();
  });
});

describe("inicioDaSemana", () => {
  it("segunda-feira retorna o próprio dia", () => {
    // 2026-03-16 é segunda
    const r = inicioDaSemana(new Date(2026, 2, 16, 10));
    expect(r.getDate()).toBe(16);
    expect(r.getHours()).toBe(0);
  });
  it("domingo retorna a segunda anterior", () => {
    // 2026-03-15 é domingo
    const r = inicioDaSemana(new Date(2026, 2, 15, 10));
    expect(r.getDate()).toBe(9);
  });
  it("quarta retorna a segunda da mesma semana", () => {
    // 2026-03-18 é quarta
    const r = inicioDaSemana(new Date(2026, 2, 18, 10));
    expect(r.getDate()).toBe(16);
  });
});

describe("toDateParam", () => {
  it("formata com zero à esquerda", () => {
    expect(toDateParam(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("ida e volta com parseDataParam", () => {
    const s = "2026-07-09";
    expect(toDateParam(parseDataParam(s)!)).toBe(s);
  });
});
