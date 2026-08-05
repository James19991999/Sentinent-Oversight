import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { Modal } from "@/components/Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()} title="Confirm">
        Body
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog with title when open", () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Confirm removal">
        Are you sure?
      </Modal>
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm removal")).toBeInTheDocument();
  });

  it("calls onClose on Escape key", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirm">
        Body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirm">
        Body
      </Modal>
    );
    fireEvent.click(screen.getByRole("button", { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Modal isOpen onClose={jest.fn()} title="Confirm removal">
        Are you sure you want to remove this member?
      </Modal>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
