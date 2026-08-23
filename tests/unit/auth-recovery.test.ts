import { describe, expect, it } from "vitest";
import {
  hasPasswordRecoveryMarker,
  passwordRecoveryRedirect,
} from "../../lib/auth-recovery";

describe("password recovery URL handling", () => {
  it("recognizes Supabase recovery markers in implicit-flow hashes", () => {
    expect(
      hasPasswordRecoveryMarker(
        "http://localhost:3000/#access_token=token&type=recovery&expires_in=3600",
      ),
    ).toBe(true);
  });

  it("recognizes recovery markers in query parameters and rejects ordinary URLs", () => {
    expect(hasPasswordRecoveryMarker("http://localhost:3000/?type=recovery")).toBe(true);
    expect(hasPasswordRecoveryMarker("http://localhost:3000/operator")).toBe(false);
  });

  it("builds a dedicated local recovery redirect without a double slash", () => {
    expect(passwordRecoveryRedirect("http://localhost:3000/")).toBe(
      "http://localhost:3000/reset-password",
    );
  });
});
