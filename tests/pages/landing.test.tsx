import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import LandingPage from "@/app/[locale]/(marketing)/page";

describe("LandingPage", () => {
  it("renders the hero heading and primary CTAs", async () => {
    render(await LandingPage({ params: { locale: "en" } }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/one command center/i);
    expect(screen.getAllByRole("link", { name: /start free trial/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it("renders all four platform pillars", async () => {
    render(await LandingPage({ params: { locale: "en" } }));
    expect(screen.getByText("Threat Detection")).toBeInTheDocument();
    expect(screen.getByText("Compliance Audits")).toBeInTheDocument();
    expect(screen.getByText("Response Automation")).toBeInTheDocument();
    expect(screen.getByText("Security Training")).toBeInTheDocument();
  });

  it("includes a language switcher", async () => {
    render(await LandingPage({ params: { locale: "en" } }));
    expect(screen.getByLabelText("Language")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(await LandingPage({ params: { locale: "en" } }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
