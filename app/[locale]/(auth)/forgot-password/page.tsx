"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    } catch (err) {
      // Deliberately still shown as success below for most cases — see
      // the anti-enumeration note on `sent`. Only a genuine rate-limit or
      // malformed-request error gets surfaced, since those aren't
      // account-existence signals.
      const code = err instanceof Error ? err.message : "";
      if (code.includes("auth/too-many-requests")) {
        setError(t("forgotPasswordRateLimited"));
        setSubmitting(false);
        return;
      }
      if (code.includes("auth/invalid-email")) {
        setError(t("forgotPasswordInvalidEmail"));
        setSubmitting(false);
        return;
      }
      // auth/user-not-found and everything else: fall through to the same
      // success state as a real send. Confirming or denying that an email
      // has an account is exactly what this guards against.
    }
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <h1 className="font-headline text-headline-md text-on-surface">{t("forgotPasswordSentTitle")}</h1>
        <p className="mt-2 text-body-sm text-on-surface-variant">{t("forgotPasswordSentBody", { email })}</p>
        <p className="mt-6 text-center text-body-sm text-on-surface-variant">
          <Link href="/sign-in" className="text-secondary hover:underline">
            {t("backToSignIn")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-headline text-headline-md text-on-surface">{t("forgotPasswordTitle")}</h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">{t("forgotPasswordSubtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <InputField
          label={t("signInEmailLabel")}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        <Link href="/sign-in" className="text-secondary hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </>
  );
}
