import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { FeatureCard } from "@/components/FeatureCard";

describe("FeatureCard", () => {
  it("renders label and value", () => {
    render(<FeatureCard icon="radar" label="Active threats" value="12" />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Active threats")).toBeInTheDocument();
  });

  it("renders a trend when provided", () => {
    render(<FeatureCard icon="radar" label="Critical" value="3" trend={{ direction: "up", value: "+2 today", positive: false }} />);
    expect(screen.getByText("+2 today")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FeatureCard icon="radar" label="Active threats" value="12" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
