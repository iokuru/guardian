import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyToClipboard } from "../utils/clipboard";

describe("Clipboard Utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("copies text using navigator.clipboard when available", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const result = await copyToClipboard("sample-token");
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith("sample-token");
  });

  it("falls back to document.execCommand when navigator.clipboard fails or throws", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard permission denied")),
      },
    });

    const appendChildSpy = vi.spyOn(document.body, "appendChild");
    const removeChildSpy = vi.spyOn(document.body, "removeChild");
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard("fallback-text");
    expect(result).toBe(true);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it("returns false if both clipboard API and execCommand fail", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("SecurityError")),
      },
    });
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error("execCommand not supported");
    });

    const result = await copyToClipboard("unsupported-text");
    expect(result).toBe(false);
  });
});
