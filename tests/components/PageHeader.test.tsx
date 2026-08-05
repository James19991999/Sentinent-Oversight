import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { PageHeader } from "@/components/PageHeader";

describe("PageHeader", () => {
  it("renders eyebrow, title, and description", () => {
    render(<PageHeader eyebrow="Detection" title="Threat Detection" description="Every flagged event." />);
    expect(screen.getByRole("heading", { name: "Threat Detection" })).toBeInTheDocument();
    expect(screen.getByText("Detection")).toBeInTheDocument();
    expect(screen.getByText("Every flagged event.")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(<PageHeader title="Billing" actions={<button>Upgrade</button>} />);
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PageHeader title="Settings" description="Configure your workspace." />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
