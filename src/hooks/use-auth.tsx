import type * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  /** 저장된 로그인 정보를 아직 확인하는 중 */
  loading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** 가입 후 바로 로그인되면 true, 메일 인증이 필요하면 false */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

// Keep one context object even when this file is hot-reloaded during development;
// otherwise an already-mounted provider and freshly loaded consumers stop seeing each other.
const CTX_KEY = "__fridgeChefAuthContext";
const store = globalThis as unknown as Record<string, React.Context<AuthState | null> | undefined>;
const AuthContext: React.Context<AuthState | null> = store[CTX_KEY] ?? (store[CTX_KEY] = createContext<AuthState | null>(null));

const notReady = async () => {
  throw new Error("로그인 기능을 준비 중이에요. 잠시 후 다시 시도해 주세요.");
};
/** Used if a component renders outside the provider: behave as a guest instead of crashing. */
const GUEST_FALLBACK: AuthState = { loading: false, user: null, signIn: notReady, signUp: notReady, signOut: async () => {} };

/** 앱 전체에서 한 번만 로그인 상태를 구독해요 (__root에 한 번 감싸 둠). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    // An already-registered email comes back with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      throw Object.assign(new Error("already registered"), { code: "user_already_exists" });
    }
    return !!data.session;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    // Even if the server call fails, drop the local session so the screen returns to guest mode.
    if (error) await supabase.auth.signOut({ scope: "local" });
    setUser(null);
  }, []);

  const value = useMemo(() => ({ loading, user, signIn, signUp, signOut }), [loading, user, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx && import.meta.env.DEV) console.warn("useAuth used outside <AuthProvider>; falling back to guest mode");
  return ctx ?? GUEST_FALLBACK;
}
