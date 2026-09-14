import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

const mockCreateUser = jest.fn();
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

const pushMock = jest.fn();
jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => {
    const React = require("react");
    return React.createElement("a", { href: `/en${href}`, ...props }, children);
  },
  useRouter: () => ({ push: pushMock, replace: jest.fn(), refresh: jest.fn() }),
}));

import SignUpPage from "@/app/[locale]/(auth)/sign-up/page";

describe("SignUpPage", () => {
  beforeEach(() => {
    mockCreateUser.mockReset();
    pushMock.mockReset();
  });

  it("renders organization, email, and password fields", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("enforces an 8-character minimum on the password field", () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("minLength", "8");
  });

  it("redirects to /complete-setup instead of showing an error when the Firebase account is created but organization setup fails", async () => {
    mockCreateUser.mockResolvedValue({ user: { getIdToken: async () => "valid-token" } });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ data: null, error: "Something went wrong server-side" }),
    }) as unknown as typeof fetch;

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longenoughpw" } });
    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/complete-setup");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still shows a normal error when account creation itself fails (email already in use)", async () => {
    mockCreateUser.mockRejectedValue(new Error("Firebase: auth/email-already-in-use"));

    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longenoughpw" } });
    fireEvent.click(screen.getByRole("button", { name: /create workspace/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/already registered/i);
    });
    expect(pushMock).not.toHaveBeenCalledWith("/complete-setup");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SignUpPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
