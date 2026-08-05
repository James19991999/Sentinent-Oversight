"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "./firebase-client";
import type { Role } from "./types";

interface AuthState {
  user: User | null;
  orgId: string | null;
  role: Role | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  orgId: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    orgId: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(getFirebaseAuth(), async (user) => {
      if (!user) {
        setState({ user: null, orgId: null, role: null, loading: false });
        return;
      }
      // Custom claims (orgId, role) are set server-side at sign-up/invite
      // time and are only readable, never writable, from the client.
      const tokenResult = await user.getIdTokenResult();
      setState({
        user,
        orgId: (tokenResult.claims.orgId as string) ?? null,
        role: (tokenResult.claims.role as Role) ?? null,
        loading: false,
      });
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
