import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Overview } from "../pages/Overview";
import { DEFAULT_MOCK_ANALYSES, DEFAULT_MOCK_STATS } from "../api/mockData";

describe("Overview Page Component", () => {
  const defaultProps = {
    stats: DEFAULT_MOCK_STATS,
    analyses: DEFAULT_MOCK_ANALYSES,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    onNavigate: vi.fn(),
    onSelectAnalysis: vi.fn(),
  };

  it("renders overview metrics and headline counts", () => {
    render(<Overview {...defaultProps} />);
    expect(screen.getByText(/5 evaluations/i)).toBeInTheDocument();
    expect(screen.getAllByText(/blocked/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/review/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/allowed/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders recent decisions list", () => {
    render(<Overview {...defaultProps} />);
    expect(screen.getByText("Delete customer records")).toBeInTheDocument();
    expect(screen.getByText("Extract credentials & secrets")).toBeInTheDocument();
  });

  it("navigates to decisions view when clicking View all", () => {
    const onNavigate = vi.fn();
    render(<Overview {...defaultProps} onNavigate={onNavigate} />);

    const viewAllBtn = screen.getByRole("button", { name: /view all/i });
    fireEvent.click(viewAllBtn);
    expect(onNavigate).toHaveBeenCalledWith("decisions");
  });

  it("invokes onSelectAnalysis when an analysis row is selected", () => {
    const onSelectAnalysis = vi.fn();
    render(<Overview {...defaultProps} onSelectAnalysis={onSelectAnalysis} />);

    const recordTitle = screen.getByText("Delete customer records");
    fireEvent.click(recordTitle);
    expect(onSelectAnalysis).toHaveBeenCalledWith(12);
  });

  it("switches chart time ranges and dynamically updates evaluation metrics", () => {
    render(<Overview {...defaultProps} />);
    expect(screen.getByText(/5 evaluations/i)).toBeInTheDocument();
    expect(screen.getByText(/last 24 hours/i)).toBeInTheDocument();

    const btn1h = screen.getByRole("button", { name: "1h" });
    const btn7d = screen.getByRole("button", { name: "7d" });

    fireEvent.click(btn1h);
    expect(screen.getByText(/3 evaluations/i)).toBeInTheDocument();
    expect(screen.getByText(/last 1 hour/i)).toBeInTheDocument();

    fireEvent.click(btn7d);
    expect(screen.getByText(/384 evaluations/i)).toBeInTheDocument();
    expect(screen.getByText(/last 7 days/i)).toBeInTheDocument();
  });

  it("renders empty state and allows navigating to evaluate first action", () => {
    const onNavigate = vi.fn();
    render(
      <Overview
        {...defaultProps}
        analyses={[]}
        stats={{ ...DEFAULT_MOCK_STATS, total_evaluations: 0 }}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText(/no decisions recorded in this workspace yet/i)).toBeInTheDocument();
    const evalBtn = screen.getByRole("button", { name: /evaluate first action/i });
    fireEvent.click(evalBtn);
    expect(onNavigate).toHaveBeenCalledWith("analyze");
  });

  it("renders error state and triggers onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(
      <Overview
        {...defaultProps}
        analyses={[]}
        stats={null}
        error="Failed to connect to GUARDIAN backend service"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/failed to connect to guardian backend service/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry connection/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
