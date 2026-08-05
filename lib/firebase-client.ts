"use client";

import { initializeApp, getApps, type FirebaseOptions, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Only NEXT_PUBLIC_* values reach the client bundle. No service-account
// credentials, API secrets, or Stripe secret keys are referenced here —
// see Security Checklist item "secrets never exposed to the client bundle".
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedApp: FirebaseApp | null = null;

/**
 * Lazy, on-first-use initialization rather than a top-level singleton.
 * Marketing and auth pages are statically prerendered at build time, and a
 * top-level `getAuth(initializeApp(...))` runs during that prerender pass
 * even with no browser present — with placeholder/missing env vars that
 * throws and fails the build. Deferring initialization until something
 * actually calls getFirebaseAuth()/getFirebaseDb() (always from a
 * useEffect or an event handler, i.e. in the browser, with real env vars
 * configured) avoids that without weakening anything at runtime.
 */
function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;

  const missing = (
    [
      ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
      ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Firebase client is not configured (${missing.join(", ")}). Copy .env.example to .env.local and restart the dev server.`
    );
  }

  const existing = getApps();
  cachedApp = existing.length > 0 && existing[0] ? existing[0] : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getGoogleProvider(): GoogleAuthProvider {
  return new GoogleAuthProvider();
}
