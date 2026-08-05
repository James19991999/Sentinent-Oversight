import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { InputField } from "@/components/InputField";

describe("InputField", () => {
  it("associates the label with the input", () => {
    render(<InputField label="Email" type="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders an error with role=alert and links it via aria-describedby", () => {
    render(<InputField label="Password" type="password" error="Too short" />);
    const input = screen.getByLabelText("Password");
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Too short");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<InputField label="Organization name" type="text" hint="Shown to your team" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
