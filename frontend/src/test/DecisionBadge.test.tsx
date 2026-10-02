import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionBadge, RiskBadge, RiskScoreMeter } from "../components/DecisionBadge";

describe("DecisionBadge Component", () => {
  it("renders ALLOW decision correctly", () => {
    const { container } = render(<DecisionBadge decision="ALLOW" />);
    expect(screen.getByText("ALLOW")).toBeInTheDocument();
    expect(container.querySelector(".decision-allow")).toBeInTheDocument();
  });

  it("renders REVIEW decision correctly", () => {
    const { container } = render(<DecisionBadge decision="REVIEW" />);
    expect(screen.getByText("REVIEW")).toBeInTheDocument();
    expect(container.querySelector(".decision-review")).toBeInTheDocument();
  });

  it("renders BLOCK decision correctly", () => {
    const { container } = render(<DecisionBadge decision="BLOCK" />);
    expect(screen.getByText("BLOCK")).toBeInTheDocument();
    expect(container.querySelector(".decision-block")).toBeInTheDocument();
  });
});

describe("RiskBadge Component", () => {
  it("renders risk levels correctly", () => {
    const { container } = render(<RiskBadge level="CRITICAL" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(container.querySelector(".risk-critical")).toBeInTheDocument();
  });
});

describe("RiskScoreMeter Component", () => {
  it("clamps score between 0 and 1 and calculates critical level", () => {
    render(<RiskScoreMeter score={0.95} />);
    expect(screen.getByText("0.95")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
  });

  it("derives LOW level for score below 0.3", () => {
    render(<RiskScoreMeter score={0.12} />);
    expect(screen.getByText("0.12")).toBeInTheDocument();
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });
});
