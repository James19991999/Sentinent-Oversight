import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

const mockSendReset = jest.fn();
jest.mock("firebase/auth", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendReset(...args),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

import ForgotPasswordPage from "@/app/[locale]/(auth)/forgot-password/page";

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mockSendReset.mockReset();
  });

  it("renders an email field", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows the same success state when the email genuinely exists", async () => {
    mockSendReset.mockResolvedValue(undefined);
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "real@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("shows the same success state when the email does NOT exist (anti-enumeration)", async () => {
    mockSendReset.mockRejectedValue(new Error("Firebase: auth/user-not-found"));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nobody@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("surfaces a real error for rate-limiting instead of the generic success state", async () => {
    mockSendReset.mockRejectedValue(new Error("Firebase: auth/too-many-requests"));
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/too many attempts/i);
    });
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ForgotPasswordPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
