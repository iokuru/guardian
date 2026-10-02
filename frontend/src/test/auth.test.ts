import { describe, it, expect, beforeEach, vi } from "vitest";
import { login, getCurrentUser } from "../api/auth";

describe("Authentication Service", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("calls /auth/login with credentials and returns tokens", async () => {
    const mockResponse = { access_token: "jwt_token_123", token_type: "bearer" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await login({ username: "analyst", password: "password123" });
    expect(result).toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "analyst", password: "password123" }),
      })
    );
  });

  it("calls /auth/me with Bearer token if token is present in localStorage", async () => {
    localStorage.setItem("guardian_token", "saved_secret_jwt");
    const mockUser = { id: 1, username: "analyst", email: "analyst@guardian.security", role: "ANALYST" };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    const user = await getCurrentUser();
    expect(user).toEqual(mockUser);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer saved_secret_jwt",
        }),
      })
    );
  });

  it("throws descriptive error when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Invalid analyst credentials" }),
    } as Response);

    await expect(login({ username: "bad", password: "wrong" })).rejects.toThrow(
      "Invalid analyst credentials"
    );
  });
});
