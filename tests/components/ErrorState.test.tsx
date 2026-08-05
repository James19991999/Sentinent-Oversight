import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { ErrorState } from "@/components/ErrorState";

describe("ErrorState", () => {
  it("renders default copy", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls onRetry when the retry button is clicked", () => {
    const onRetry = jest.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ErrorState />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
