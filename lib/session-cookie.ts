/** HttpOnly session cookie options — `secure` off on localhost so dev login works. */
export function sessionCookieOptions(maxAgeSeconds: number) {
  const secure =
    process.env.NODE_ENV === "production" ||
    (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    maxAge: maxAgeSeconds,
    path: "/",
  };
}
