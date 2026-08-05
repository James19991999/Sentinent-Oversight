import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

describe("LoadingSkeleton", () => {
  it("announces loading state to assistive tech", () => {
    render(<LoadingSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the requested number of placeholder rows", () => {
    const { container } = render(<LoadingSkeleton rows={6} />);
    expect(container.querySelectorAll(".bg-surface-container-high")).toHaveLength(6);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<LoadingSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
