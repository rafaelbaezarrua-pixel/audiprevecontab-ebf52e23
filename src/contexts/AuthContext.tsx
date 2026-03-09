import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface UserPermissions {
  isAdmin: boolean;
  userId?: string;
  modules: {
    societario: boolean;
    fiscal: boolean;
    pessoal: boolean;
    certificados: boolean;
    procuracoes: boolean;
    vencimentos: boolean;
    parcelamentos: boolean;
    recalculos: boolean;
    honorarios: boolean;
    licencas: boolean;
    certidoes: boolean;
  };
  nome?: string;
  email?: string;
  cpf?: string;
  departamento?: string;
  profileCompleted?: boolean;
  termsAccepted?: boolean;
  firstAccessDone?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: UserPermissions | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const allModulesTrue = {
  societario: true, fiscal: true, pessoal: true, certificados: true,
  procuracoes: true, vencimentos: true, parcelamentos: true, recalculos: true,
  honorarios: true, licencas: true, certidoes: true,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingUserRef = useRef<string | null>(null);

  const loadUserData = async (currentUser: User) => {
    if (loadingUserRef.current === currentUser.id) return;
    loadingUserRef.current = currentUser.id;

    try {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id);
      const isAdmin = roles?.some(r => r.role === "admin") || false;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nome_completo, profile_completed, terms_accepted_at, first_access_done, cpf, departamento")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileError && profileError.name !== 'AbortError') {
        console.error("AuthProvider: Error fetching profile for user", currentUser.id, profileError);
      }

      // Robust state derivation
      // If profile is missing or fields are null, we decide based on 'trustING' existing users
      const profileCompleted = profile ? (profile.profile_completed ?? true) : true;
      const termsAccepted = profile ? !!profile.terms_accepted_at : true;
      const firstAccessDone = profile ? (profile.first_access_done ?? true) : true;

      if (isAdmin) {
        setUserData({
          isAdmin: true,
          userId: currentUser.id,
          modules: allModulesTrue,
          nome: profile?.nome_completo || currentUser.user_metadata?.full_name || currentUser.email || "Admin",
          email: currentUser.email || "",
          cpf: profile?.cpf || "",
          departamento: profile?.departamento || "Administração",
          profileCompleted,
          termsAccepted,
          firstAccessDone,
        });
      } else {
        const { data: perms } = await supabase.from("user_module_permissions").select("module_name").eq("user_id", currentUser.id);
        const moduleSet = new Set(perms?.map(p => p.module_name) || []);
        setUserData({
          isAdmin: false,
          userId: currentUser.id,
          modules: {
            societario: moduleSet.has("societario"),
            fiscal: moduleSet.has("fiscal"),
            pessoal: moduleSet.has("pessoal"),
            certificados: moduleSet.has("certificados"),
            procuracoes: moduleSet.has("procuracoes"),
            vencimentos: moduleSet.has("vencimentos"),
            parcelamentos: moduleSet.has("parcelamentos"),
            recalculos: moduleSet.has("recalculos"),
            honorarios: moduleSet.has("honorarios"),
            licencas: moduleSet.has("licencas"),
            certidoes: moduleSet.has("certidoes"),
          },
          nome: profile?.nome_completo || currentUser.user_metadata?.full_name || currentUser.email || "Usuário",
          email: currentUser.email || "",
          cpf: profile?.cpf || "",
          departamento: profile?.departamento || "",
          profileCompleted,
          termsAccepted,
          firstAccessDone,
        });
      }
    } catch (err) {
      console.error("AuthProvider: Critical error loading user data", err);
    } finally {
      setTimeout(() => { loadingUserRef.current = null; }, 1000); // Allow refreshing after a second
    }
  };

  const refreshUserData = async () => {
    if (user) await loadUserData(user);
  };

  // Decoupled effect to fetch user data whenever `user` state changes.
  // This breaks the deadlock caused by fetching inside `onAuthStateChange` callback.
  useEffect(() => {
    let mounted = true;

    if (user && !userData) {
      loadUserData(user).then(() => {
        if (mounted) setLoading(false);
      });
    } else if (!user) {
      if (mounted) {
        setUserData(null);
        setLoading(false);
      }
    }

    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      // Trava de segurança para links de recuperação de senha enviados por e-mail
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        window.location.href = "/reset-password";
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!mounted) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      if (!existing?.user) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, userData, loading, login, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};
