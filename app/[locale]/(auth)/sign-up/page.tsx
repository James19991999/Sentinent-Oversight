"use client";

import { useState, type FormEvent } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";

export default function SignUpPage() {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await credential.user.getIdToken();

      const signUpRes = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, orgName }),
      });
      const signUpBody = await signUpRes.json();
      if (!signUpRes.ok) throw new Error(signUpBody.error ?? "Sign-up failed");

      // Claims were just set server-side — force-refresh the token so the
      // session cookie we're about to mint actually carries orgId/role.
      const freshToken = await credential.user.getIdToken(true);
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: freshToken }),
      });
      if (!sessionRes.ok) throw new Error("Could not start session");

      router.push("/dashboard");
    } catch (err) {
      let message = "Something went wrong";
      
      if (err instanceof Error) {
        const errorMsg = err.message;
        
        // Handle Firebase Auth errors with user-friendly messages
        if (errorMsg.includes("auth/email-already-in-use")) {
          message = "This email is already registered. Please sign in instead.";
        } else if (errorMsg.includes("auth/weak-password")) {
          message = "Password must be at least 8 characters.";
        } else if (errorMsg.includes("auth/invalid-email")) {
          message = "Please enter a valid email address.";
        } else if (!errorMsg.startsWith("Firebase:")) {
          // Show non-Firebase errors (e.g., server errors)
          message = errorMsg;
        } else {
          message = "Failed to create account. Please try again.";
        }
      }
      
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-headline text-headline-md text-on-surface">{t("signUpTitle")}</h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">{t("signUpSubtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <InputField
          label={t("orgNameLabel")}
          type="text"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          autoComplete="organization"
        />
        <InputField
          label={t("emailLabel")}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <InputField
          label={t("passwordLabel")}
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint={t("passwordHint")}
        />
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("signUpSubmitting") : t("signUpSubmit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/sign-in" className="text-secondary hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </>
  );
}
