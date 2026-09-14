import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

const mockSignIn = jest.fn();
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

// Override the global next/navigation mock with a stable push spy so we
// can assert exactly where the sign-in flow sends the user in each case.
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import SignInPage from "@/app/[locale]/(auth)/sign-in/page";

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    pushMock.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true }, error: null }) }) as unknown as typeof fetch;
  });

  it("renders labeled email and password fields", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders a forgot-password link pointing to /forgot-password", () => {
    render(<SignInPage />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("/forgot-password"));
  });

  it("shows a generic error message on failed sign-in without revealing account existence", async () => {
    mockSignIn.mockRejectedValue(new Error("auth/user-not-found"));
    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Incorrect email or password.");
    });
  });

  it("redirects to /complete-setup instead of showing a wrong-password error when the account has no organization yet", async () => {
    mockSignIn.mockResolvedValue({ user: { getIdToken: async () => "valid-token" } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: "ACCOUNT_NOT_PROVISIONED", code: "ACCOUNT_NOT_PROVISIONED" }),
    }) as unknown as typeof fetch;

    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/complete-setup"));
    });
    // Must NOT show the generic wrong-password message — the password was correct.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SignInPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
