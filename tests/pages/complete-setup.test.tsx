import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";

const mockOnAuthStateChanged = jest.fn();
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth: unknown, cb: (user: unknown) => void) => mockOnAuthStateChanged(cb),
}));
jest.mock("@/lib/firebase-client", () => ({ getFirebaseAuth: () => ({}) }));

const pushMock = jest.fn();
const replaceMock = jest.fn();
jest.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: jest.fn() }),
}));

import CompleteSetupPage from "@/app/[locale]/(auth)/complete-setup/page";

const fakeUser = { getIdToken: async () => "fresh-token" };

describe("CompleteSetupPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    mockOnAuthStateChanged.mockReset();
  });

  it("redirects to sign-in if there is no authenticated user", async () => {
    mockOnAuthStateChanged.mockImplementation((cb) => {
      cb(null);
      return () => {};
    });
    render(<CompleteSetupPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/sign-in");
    });
  });

  it("renders the organization-name form for an authenticated user", async () => {
    mockOnAuthStateChanged.mockImplementation((cb) => {
      cb(fakeUser);
      return () => {};
    });
    render(<CompleteSetupPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Organization name")).toBeInTheDocument();
    });
  });

  it("provisions the organization and starts a session on submit", async () => {
    mockOnAuthStateChanged.mockImplementation((cb) => {
      cb(fakeUser);
      return () => {};
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { orgId: "org-new" }, error: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ok: true }, error: null }) }) as unknown as typeof fetch;

    render(<CompleteSetupPage />);
    await waitFor(() => screen.getByLabelText("Organization name"));

    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: /complete setup/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/auth/sign-up", expect.objectContaining({ method: "POST" }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/session", expect.objectContaining({ method: "POST" }));
  });

  it("has no accessibility violations once loaded", async () => {
    mockOnAuthStateChanged.mockImplementation((cb) => {
      cb(fakeUser);
      return () => {};
    });
    const { container } = render(<CompleteSetupPage />);
    await waitFor(() => screen.getByLabelText("Organization name"));
    expect(await axe(container)).toHaveNoViolations();
  });
});
