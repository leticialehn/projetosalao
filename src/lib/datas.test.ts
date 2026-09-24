import { describe, it, expect } from "vitest";
import {
  inicioDoDia,
  fimDoDia,
  inicioDoDiaSeguinte,
  intervaloMes,
  parseDataParam,
  inicioDaSemana,
  toDateParam,
  periodoAnterior,
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

describe("periodoAnterior", () => {
  it("período de 30 dias → período anterior também de 30 dias, terminando no dia anterior ao início do original", () => {
    // 01/03/2026 a 30/03/2026 = 30 dias
    const de = new Date(2026, 2, 1);
    const ate = new Date(2026, 2, 30);
    const r = periodoAnterior(de, ate);
    // Termina no dia anterior ao início do período original.
    expect(toDateParam(r.ate)).toBe("2026-02-28");
    // Mesma duração: 30 dias (30/01 a 28/02 = 30 dias, ano não bissexto).
    expect(toDateParam(r.de)).toBe("2026-01-30");
    const diasOriginal = Math.round(
      (inicioDoDiaSeguinte(ate).getTime() - inicioDoDia(de).getTime()) /
        86400000,
    );
    const diasAnterior = Math.round(
      (inicioDoDiaSeguinte(r.ate).getTime() - inicioDoDia(r.de).getTime()) /
        86400000,
    );
    expect(diasAnterior).toBe(diasOriginal);
  });

  it("período de 1 dia → período anterior de 1 dia (o dia imediatamente anterior)", () => {
    const d = new Date(2026, 2, 15);
    const r = periodoAnterior(d, d);
    expect(toDateParam(r.de)).toBe("2026-03-14");
    expect(toDateParam(r.ate)).toBe("2026-03-14");
  });

  it("não muta as entradas", () => {
    const de = new Date(2026, 2, 1, 10);
    const ate = new Date(2026, 2, 30, 10);
    periodoAnterior(de, ate);
    expect(de.getDate()).toBe(1);
    expect(ate.getDate()).toBe(30);
  });
});
