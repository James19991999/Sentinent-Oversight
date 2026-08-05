import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

import SignUpPage from "@/app/[locale]/(auth)/sign-up/page";

describe("SignUpPage", () => {
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

  it("has no accessibility violations", async () => {
    const { container } = render(<SignUpPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
