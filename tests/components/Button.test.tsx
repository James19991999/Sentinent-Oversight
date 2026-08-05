import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Button } from "@/components/Button";

describe("Button", () => {
  it("renders children and responds to click", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Run now</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Run now" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Run now</Button>);
    expect(screen.getByRole("button", { name: "Run now" })).toBeDisabled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button>Save changes</Button>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
