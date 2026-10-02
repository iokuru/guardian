import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Topbar } from "../components/Topbar";

describe("Topbar Navigation Component", () => {
  const defaultProps = {
    currentRoute: "overview" as const,
    onNavigate: vi.fn(),
    onRefresh: vi.fn(),
    isRefreshing: false,
    activeWorkspace: "Production",
    onSelectWorkspace: vi.fn(),
  };

  it("renders workspace name and current breadcrumbs", () => {
    render(<Topbar {...defaultProps} />);
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Workspace")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("opens workspace dropdown and selects a different workspace", () => {
    const onSelectWorkspace = vi.fn();
    render(<Topbar {...defaultProps} onSelectWorkspace={onSelectWorkspace} />);

    const wsButton = screen.getByRole("button", { name: /production/i });
    fireEvent.click(wsButton);

    expect(screen.getByText("Development")).toBeInTheDocument();
    expect(screen.getByText("Staging")).toBeInTheDocument();

    const stagingOption = screen.getByText("Staging");
    fireEvent.click(stagingOption);

    expect(onSelectWorkspace).toHaveBeenCalledWith("Staging");
  });

  it("navigates to analyze workbench when New evaluation button is clicked", () => {
    const onNavigate = vi.fn();
    render(<Topbar {...defaultProps} onNavigate={onNavigate} />);

    const analyzeBtn = screen.getByRole("button", { name: /analyze/i });
    fireEvent.click(analyzeBtn);

    expect(onNavigate).toHaveBeenCalledWith("analyze");
  });

  it("calls onRefresh when refresh button is clicked", () => {
    const onRefresh = vi.fn();
    render(<Topbar {...defaultProps} onRefresh={onRefresh} />);

    const refreshBtn = screen.getByTitle("Refresh workspace data");
    fireEvent.click(refreshBtn);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
