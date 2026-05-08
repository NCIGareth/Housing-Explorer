"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState, createContext, useContext } from "react";

type AuthContext = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContext>({ user: null, loading: true });

export function useUser() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
