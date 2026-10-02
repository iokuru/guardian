import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Decisions } from "../pages/Decisions";
import { DEFAULT_MOCK_ANALYSES } from "../api/mockData";

describe("Decisions Page Component", () => {
  const defaultProps = {
    analyses: DEFAULT_MOCK_ANALYSES,
    loading: false,
    onRefresh: vi.fn(),
    onSelectAnalysis: vi.fn(),
  };

  it("renders page header and filter pill buttons with correct counts", () => {
    render(<Decisions {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /^decisions$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all \(5\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /blocked \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /allowed \(2\)/i })).toBeInTheDocument();
  });

  it("filters records by decision type when filter pill is clicked", () => {
    render(<Decisions {...defaultProps} />);
    const blockedPill = screen.getByRole("button", { name: /blocked \(2\)/i });
    fireEvent.click(blockedPill);

    expect(screen.getByText("Delete customer records")).toBeInTheDocument();
    expect(screen.getByText("Extract credentials & secrets")).toBeInTheDocument();
    expect(screen.queryByText("Create database backup & export")).not.toBeInTheDocument();
  });

  it("filters decisions by search query in real time", () => {
    render(<Decisions {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search decisions\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "backup.sql" } });

    expect(screen.getByText("Create database backup & export")).toBeInTheDocument();
    expect(screen.queryByText("Delete customer records")).not.toBeInTheDocument();
  });

  it("triggers onSelectAnalysis when an analysis row is clicked", () => {
    const onSelectAnalysis = vi.fn();
    render(<Decisions {...defaultProps} onSelectAnalysis={onSelectAnalysis} />);

    const rowItem = screen.getByText("Delete customer records");
    fireEvent.click(rowItem);

    expect(onSelectAnalysis).toHaveBeenCalledWith(12);
  });

  it("triggers onRefresh when clicking the refresh button", () => {
    const onRefresh = vi.fn();
    render(<Decisions {...defaultProps} onRefresh={onRefresh} />);

    const refreshBtn = screen.getByRole("button", { name: /refresh decisions/i });
    fireEvent.click(refreshBtn);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("displays empty state when no decisions match filter criteria", () => {
    render(<Decisions {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search decisions\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "nonexistent-query-string-xyz" } });

    expect(screen.getByText(/no decisions match your current filters\./i)).toBeInTheDocument();
  });

  it("copies command to clipboard when copy button is clicked", async () => {
    render(<Decisions {...defaultProps} />);
    const copyBtns = screen.getAllByTitle("Copy evaluated command");
    fireEvent.click(copyBtns[0]);

    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
