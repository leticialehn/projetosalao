import { describe, it, expect, beforeAll } from "vitest";
import bcrypt from "bcryptjs";
import { autenticar, HASH_DUMMY } from "./auth";

describe("autenticar", () => {
  let hashCerto: string;
  beforeAll(async () => {
    hashCerto = await bcrypt.hash("senhaCorreta", 10);
  });

  it("senha certa para usuário existente → true", async () => {
    expect(await autenticar({ senhaHash: hashCerto }, "senhaCorreta")).toBe(true);
  });

  it("senha errada para usuário existente → false", async () => {
    expect(await autenticar({ senhaHash: hashCerto }, "outraSenha")).toBe(false);
  });

  it("usuário inexistente (registro null) → false", async () => {
    expect(await autenticar(null, "qualquerCoisa")).toBe(false);
  });

  it("HASH_DUMMY é um bcrypt válido (usado no caminho sem usuário)", async () => {
    // não deve lançar; retorna boolean
    const r = await bcrypt.compare("x", HASH_DUMMY);
    expect(typeof r).toBe("boolean");
  });
});
