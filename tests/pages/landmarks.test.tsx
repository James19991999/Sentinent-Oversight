import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import AuthLayout from "@/app/[locale]/(auth)/layout";
import NotFound from "@/app/[locale]/not-found";

/**
 * Regression coverage for an audit finding: component-level jest-axe
 * checks (rendering a component in isolation) missed a page-level
 * landmark violation that a full-document axe-core scan of the built
 * HTML caught on /sign-in, /sign-up, and /_not-found. Running axe
 * against `document.body` here — not just the returned render container —
 * exercises the same "content must be inside a landmark" check these
 * pages actually failed before the fix (bare <div> instead of <main>).
 */
describe("Page-level landmark coverage (audit regression)", () => {
  it("AuthLayout wraps its content in a <main> landmark", () => {
    const { container } = render(
      <AuthLayout>
        <p>Sign-in form goes here</p>
      </AuthLayout>
    );
    expect(container.querySelector("main")).not.toBeNull();
  });

  it("AuthLayout has no accessibility violations at the document level", async () => {
    render(
      <AuthLayout>
        <p>Sign-in form goes here</p>
      </AuthLayout>
    );
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it("NotFound wraps its content in a <main> landmark", async () => {
    const { container } = render(await NotFound());
    expect(container.querySelector("main")).not.toBeNull();
  });

  it("NotFound has no accessibility violations at the document level", async () => {
    render(await NotFound());
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });
});
