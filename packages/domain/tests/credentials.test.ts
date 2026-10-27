import { describe, expect, it } from "vitest";
import {
  INITIAL_LOGIN_ATTEMPTS,
  loginBackoffSeconds,
  passwordIssues,
  registerLoginFailure,
  remainingWaitSeconds,
} from "../src/index.ts";

const common = new Set(["senhaforte123", "password1234"]);
const isCommon = (p: string) => common.has(p);

describe("passwordIssues (RN-031)", () => {
  it("aceita senha longa, distinta do e-mail e fora da lista", () => {
    expect(
      passwordIssues({ password: "Trilha-de-ferro-27", email: "a@exemplo.test", isCommon }),
    ).toEqual([]);
  });

  it("exige 10 caracteres contando caracteres, não unidades UTF-16", () => {
    expect(passwordIssues({ password: "curta123", email: "a@b.test", isCommon })).toEqual([
      "too_short",
    ]);
    expect(passwordIssues({ password: "😀😀😀😀😀😀😀😀😀", email: "a@b.test", isCommon })).toEqual(
      ["too_short"],
    );
  });

  it("recusa senha igual ao e-mail, ignorando caixa e espaços", () => {
    expect(
      passwordIssues({ password: " Pessoa@Exemplo.test ", email: "pessoa@exemplo.test", isCommon }),
    ).toEqual(["equals_email"]);
  });

  it("recusa senha comum sem diferenciar maiúsculas", () => {
    expect(passwordIssues({ password: "Password1234", email: "a@b.test", isCommon })).toEqual([
      "common",
    ]);
  });

  it("recusa repetir a senha atual", () => {
    expect(
      passwordIssues({
        password: "Trilha-de-ferro-27",
        currentPassword: "Trilha-de-ferro-27",
        email: "a@b.test",
        isCommon,
      }),
    ).toEqual(["same_as_current"]);
  });
});

describe("espera progressiva (RN-031)", () => {
  it("não espera antes da quinta falha", () => {
    expect([0, 1, 4].map(loginBackoffSeconds)).toEqual([0, 0, 0]);
  });

  it("dobra a partir da quinta falha até 15 minutos", () => {
    expect([5, 6, 7, 8, 9, 10, 20].map(loginBackoffSeconds)).toEqual([
      30, 60, 120, 240, 480, 900, 900,
    ]);
  });

  it("calcula bloqueio e tempo restante", () => {
    let state = INITIAL_LOGIN_ATTEMPTS;
    for (let i = 0; i < 5; i++) state = registerLoginFailure(state, 1_000_000);
    expect(state.consecutiveFailures).toBe(5);
    expect(remainingWaitSeconds(state, 1_000_000)).toBe(30);
    expect(remainingWaitSeconds(state, 1_029_500)).toBe(1);
    expect(remainingWaitSeconds(state, 1_031_000)).toBe(0);
  });
});
