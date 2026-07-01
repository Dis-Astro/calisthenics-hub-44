import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Tables } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];
type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCoach: boolean;
  isStaff: boolean;
  isSegretaria: boolean;
  isClientePalestra: boolean;
  isClienteCoaching: boolean;
  isClienteCorso: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null, deferProfile = false) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const loadProfile = async () => {
        const nextProfile = await fetchProfile(nextSession.user.id);
        if (!isMounted) return;
        setProfile(nextProfile);
        setLoading(false);
      };

      if (deferProfile) {
        setTimeout(loadProfile, 0);
      } else {
        void loadProfile();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession, true);
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      applySession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = profile?.role === "admin";
    const isCoach = profile?.role === "coach";

    return {
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
      isAdmin,
      isCoach,
      isStaff: isAdmin || isCoach,
      isSegretaria: profile?.role === "segretaria",
      isClientePalestra: profile?.role === "cliente_palestra",
      isClienteCoaching: profile?.role === "cliente_coaching",
      isClienteCorso: profile?.role === "cliente_corso",
    };
  }, [loading, profile, session, signIn, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
