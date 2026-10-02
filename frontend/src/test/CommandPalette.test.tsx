import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "../components/CommandPalette";

describe("CommandPalette Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    onLogout: vi.fn(),
    onSelectWorkspace: vi.fn(),
    activeWorkspace: "Production",
  };

  it("renders null when isOpen is false", () => {
    const { container } = render(<CommandPalette {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal dialog with search input when isOpen is true", () => {
    render(<CommandPalette {...defaultProps} />);
    const dialog = screen.getByRole("dialog", { name: /command palette/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
  });

  it("filters command list when user types in search input", () => {
    render(<CommandPalette {...defaultProps} />);
    const input = screen.getByPlaceholderText(/type a command/i);

    fireEvent.change(input, { target: { value: "Audit" } });
    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
    expect(screen.queryByText("Action Workbench (Analyze)")).not.toBeInTheDocument();
  });

  it("calls onClose when ESC key cap is clicked", () => {
    const onClose = vi.fn();
    render(<CommandPalette {...defaultProps} onClose={onClose} />);

    const escBadge = screen.getByText("ESC");
    fireEvent.click(escBadge);
    expect(onClose).toHaveBeenCalled();
  });

  it("executes command action and closes when item is clicked", () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        {...defaultProps}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );

    const auditItem = screen.getByText("Audit Logs");
    fireEvent.click(auditItem);

    expect(onNavigate).toHaveBeenCalledWith("audit");
    expect(onClose).toHaveBeenCalled();
  });

  it("supports keyboard navigation with ArrowDown, ArrowUp, and Enter", () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    render(
      <CommandPalette
        {...defaultProps}
        onNavigate={onNavigate}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(onNavigate).toHaveBeenCalledWith("analyze");
    expect(onClose).toHaveBeenCalled();
  });

  it("triggers workspace switch via palette action", () => {
    const onSelectWorkspace = vi.fn();
    render(
      <CommandPalette
        {...defaultProps}
        onSelectWorkspace={onSelectWorkspace}
      />
    );

    const devWs = screen.getByText("Switch to Development");
    fireEvent.click(devWs);

    expect(onSelectWorkspace).toHaveBeenCalledWith("Development");
  });
});
