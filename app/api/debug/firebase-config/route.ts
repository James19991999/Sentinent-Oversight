import { NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check if Firebase Admin credentials are properly configured.
 * Call this from your browser: https://your-domain.com/api/debug/firebase-config
 * 
 * IMPORTANT: This should ONLY be used for debugging. Delete this file before production.
 */
export async function GET() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const diagnostics = {
    hasFirebaseAdminProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    hasFallbackProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    resolvedProjectId: projectId || "❌ NOT SET",
    projectIdMatch: process.env.FIREBASE_ADMIN_PROJECT_ID === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
      ? "✅ Admin and public project IDs match" 
      : "⚠️ Project IDs don't match (admin vs fallback)",
    hasClientEmail: !!clientEmail,
    clientEmailValue: clientEmail ? `✅ ${clientEmail}` : "❌ NOT SET",
    hasPrivateKey: !!privateKey,
    privateKeyFormat: privateKey 
      ? privateKey.includes("-----BEGIN PRIVATE KEY-----")
        ? "✅ Correct format"
        : "❌ Invalid format (should start with -----BEGIN PRIVATE KEY-----)"
      : "❌ NOT SET",
    privateKeyLength: privateKey?.length ?? 0,
    hasNewlines: privateKey?.includes("\n")
      ? "✅ Contains newlines"
      : privateKey?.includes("\\n")
      ? "⚠️ Contains escaped newlines (\\n) - might cause issues"
      : "❌ No newlines found",
    clientSideConfig: {
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    summary:
      projectId && clientEmail && privateKey
        ? "✅ All required credentials are present"
        : "❌ Missing required credentials",
  };

  return NextResponse.json(diagnostics, {
    headers: { "Content-Type": "application/json" },
  });
}
