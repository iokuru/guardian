import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../components/Sidebar";

describe("Sidebar Navigation Component", () => {
  const defaultProps = {
    currentRoute: "overview" as const,
    onNavigate: vi.fn(),
    collapsed: false,
    onToggleCollapse: vi.fn(),
    username: "krishna",
    onLogout: vi.fn(),
    onOpenCommand: vi.fn(),
    activeWorkspace: "Production",
    onSelectWorkspace: vi.fn(),
  };

  it("renders primary navigation items and brand header", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Guardian")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Analyze")).toBeInTheDocument();
    expect(screen.getByText("Reviews")).toBeInTheDocument();
    expect(screen.getByText("Audit")).toBeInTheDocument();
  });

  it("calls onNavigate when clicking a route item", () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("Analyze"));
    expect(onNavigate).toHaveBeenCalledWith("analyze");
  });

  it("navigates to configuration and admin routes when clicked", () => {
    const onNavigate = vi.fn();
    render(<Sidebar {...defaultProps} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("Policies"));
    expect(onNavigate).toHaveBeenCalledWith("policies");

    fireEvent.click(screen.getByText("Risk categories"));
    expect(onNavigate).toHaveBeenCalledWith("risks");

    fireEvent.click(screen.getByText("Integrations"));
    expect(onNavigate).toHaveBeenCalledWith("integrations");
  });

  it("renders dynamic collapse button with 'Collapse sidebar' when expanded", () => {
    const onToggleCollapse = vi.fn();
    render(<Sidebar {...defaultProps} collapsed={false} onToggleCollapse={onToggleCollapse} />);

    const collapseBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("renders dynamic expand button pointing right when collapsed", () => {
    const onToggleCollapse = vi.fn();
    render(<Sidebar {...defaultProps} collapsed={true} onToggleCollapse={onToggleCollapse} />);

    const expandBtn = screen.getByRole("button", { name: /expand sidebar/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it("triggers onOpenCommand when search button is clicked", () => {
    const onOpenCommand = vi.fn();
    render(<Sidebar {...defaultProps} onOpenCommand={onOpenCommand} />);

    const searchBtn = screen.getByRole("button", { name: /search\.\.\./i });
    fireEvent.click(searchBtn);
    expect(onOpenCommand).toHaveBeenCalledTimes(1);
  });

  it("opens user menu popover and handles sign out and menu actions", () => {
    const onLogout = vi.fn();
    const onOpenCommand = vi.fn();
    render(
      <Sidebar
        {...defaultProps}
        onLogout={onLogout}
        onOpenCommand={onOpenCommand}
      />
    );

    const userOptionsBtn = screen.getByRole("button", { name: /user options/i });
    fireEvent.click(userOptionsBtn);

    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("expands on mouse enter when collapsed", () => {
    const { container } = render(<Sidebar {...defaultProps} collapsed={true} />);
    const aside = container.querySelector("aside");

    expect(aside?.classList.contains("is-collapsed")).toBe(true);
    if (aside) {
      fireEvent.mouseEnter(aside);
      expect(aside.classList.contains("is-hover-expanded")).toBe(true);
      fireEvent.mouseLeave(aside);
      expect(aside.classList.contains("is-hover-expanded")).toBe(false);
    }
  });
});
