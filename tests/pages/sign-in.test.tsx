import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

const mockSignIn = jest.fn();
jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

import SignInPage from "@/app/[locale]/(auth)/sign-in/page";

describe("SignInPage", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { ok: true }, error: null }) }) as unknown as typeof fetch;
  });

  it("renders labeled email and password fields", () => {
    render(<SignInPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
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

  it("has no accessibility violations", async () => {
    const { container } = render(<SignInPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
