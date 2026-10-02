import "@testing-library/jest-dom";
import { vi } from "vitest";

if (typeof navigator !== "undefined") {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
}

if (typeof document !== "undefined") {
  document.execCommand = vi.fn().mockReturnValue(true);
}
