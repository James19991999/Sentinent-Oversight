"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";

/**
 * Repair path for the "signed in but no organization" state: a sign-up
 * that created the Firebase Auth user but never finished creating an
 * organization (see the comment in app/api/session/route.ts for the full
 * mechanism). Reuses /api/auth/sign-up as-is — that route already safely
 * handles "this uid has no orgId yet" by provisioning one, since it only
 * refuses when orgId is ALREADY set. This page just gets a fresh idToken
 * from the already-authenticated user and calls it, no new API needed.
 */
export default function CompleteSetupPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
    });
    return unsubscribe;
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const idToken = await user.getIdToken(true);

      const signUpRes = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, orgName }),
      });
      const signUpBody = await signUpRes.json();
      if (!signUpRes.ok) throw new Error(signUpBody.error ?? "Could not finish setting up your account");

      const freshToken = await user.getIdToken(true);
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: freshToken }),
      });
      if (!sessionRes.ok) throw new Error("Could not start session");

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return <p className="text-body-sm text-on-surface-variant">{t("signInSubmitting")}</p>;
  }

  if (!user) {
    // Not actually signed in — this page only makes sense mid-flow, right
    // after a successful password check. Send them to a normal sign-in.
    router.replace("/sign-in");
    return null;
  }

  return (
    <>
      <h1 className="font-headline text-headline-md text-on-surface">{t("completeSetupTitle")}</h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">{t("completeSetupSubtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <InputField
          label={t("orgNameLabel")}
          type="text"
          required
          minLength={2}
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          autoComplete="organization"
        />
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("signUpSubmitting") : t("completeSetupSubmit")}
        </Button>
      </form>
    </>
  );
}
