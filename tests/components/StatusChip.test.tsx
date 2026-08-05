import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { StatusChip } from "@/components/StatusChip";

describe("StatusChip", () => {
  it("renders the label", () => {
    render(<StatusChip label="critical" tone="critical" />);
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<StatusChip label="resolved" tone="success" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
