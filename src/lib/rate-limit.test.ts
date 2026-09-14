import { describe, it, expect, beforeEach } from "vitest";
import {
  segundosDeEspera,
  registrarFalha,
  limparTentativas,
  _resetTudo,
} from "./rate-limit";

beforeEach(() => _resetTudo());

describe("rate-limit", () => {
  it("chave nova → sem espera", () => {
    expect(segundosDeEspera("ip1")).toBe(0);
  });

  it("abaixo do limite (4 falhas) → sem espera", () => {
    for (let i = 0; i < 4; i++) registrarFalha("ip1");
    expect(segundosDeEspera("ip1")).toBe(0);
  });

  it("no limite (5 falhas) → bloqueado com espera > 0", () => {
    for (let i = 0; i < 5; i++) registrarFalha("ip1");
    expect(segundosDeEspera("ip1")).toBeGreaterThan(0);
    expect(segundosDeEspera("ip1")).toBeLessThanOrEqual(15 * 60);
  });

  it("limparTentativas libera de novo", () => {
    for (let i = 0; i < 5; i++) registrarFalha("ip1");
    limparTentativas("ip1");
    expect(segundosDeEspera("ip1")).toBe(0);
  });

  it("a janela expira", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) registrarFalha("ip1", t0);
    expect(segundosDeEspera("ip1", t0 + 60_000)).toBeGreaterThan(0);
    expect(segundosDeEspera("ip1", t0 + 16 * 60_000)).toBe(0);
  });

  it("chaves diferentes não interferem", () => {
    for (let i = 0; i < 5; i++) registrarFalha("ip1");
    expect(segundosDeEspera("ip2")).toBe(0);
  });
});
