"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter as useNextRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";
import { InputField } from "@/components/InputField";
import { Button } from "@/components/Button";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useNextRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      const idToken = await credential.user.getIdToken();

      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionRes.ok) {
        const sessionBody = (await sessionRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(sessionBody?.error ?? "Could not start session");
      }

      // sanitizeRedirect guards against open-redirect payloads; the target
      // may still carry a locale prefix (e.g. /en/threats), which
      // router.push (from i18n/navigation) correctly treats as a plain
      // path — it only rewrites bare, unprefixed paths.
      const destination = sanitizeRedirect(searchParams.get("redirect"), `/${locale}/dashboard`);
      router.push(destination);
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      if (message && message !== "Firebase: Error (auth/invalid-credential)." && !message.startsWith("Firebase:")) {
        setError(message);
      } else {
        setError(t("signInError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-headline text-headline-md text-on-surface">{t("signInTitle")}</h1>
      <p className="mt-1 text-body-sm text-on-surface-variant">{t("signInSubtitle")}</p>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <InputField
          label={t("signInEmailLabel")}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error ? (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("signInSubmitting") : t("signInSubmit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-body-sm text-on-surface-variant">
        {t("needWorkspace")}{" "}
        <Link href="/sign-up" className="text-secondary hover:underline">
          {t("startTrialLink")}
        </Link>
      </p>
    </>
  );
}
