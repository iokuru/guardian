import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated production crash in agent component");
  }
  return <div>Component is functioning normally</div>;
}

describe("ErrorBoundary Component", () => {
  it("renders children when no runtime error occurs", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Component is functioning normally")).toBeInTheDocument();
  });

  it("intercepts runtime exceptions and displays graceful recovery UI", () => {
    // Suppress console.error in test output for intentional exception
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Application Exception Encountered")).toBeInTheDocument();
    expect(
      screen.getByText(/Simulated production crash in agent component/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reload application/i })
    ).toBeInTheDocument();

    spy.mockRestore();
  });

  it("resets error state when clicking Try Again", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Application Exception Encountered")).toBeInTheDocument();

    // Change prop so it no longer throws, then click Try again
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    expect(screen.getByText("Component is functioning normally")).toBeInTheDocument();

    spy.mockRestore();
  });
});
