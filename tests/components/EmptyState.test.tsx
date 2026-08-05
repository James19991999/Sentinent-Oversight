import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { EmptyState } from "@/components/EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState icon="inbox" title="No threats detected" description="You're all clear." />);
    expect(screen.getByText("No threats detected")).toBeInTheDocument();
    expect(screen.getByText("You're all clear.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<EmptyState icon="inbox" title="Nothing here" description="Come back later." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
