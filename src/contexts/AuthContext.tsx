import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface UserPermissions {
  isAdmin: boolean;
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
    obrigacoes: boolean;
    licencas: boolean;
    certidoes: boolean;
  };
  nome?: string;
  email?: string;
  departamento?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: UserPermissions | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  honorarios: true, obrigacoes: true, licencas: true, certidoes: true,
};

const allModulesFalse = {
  societario: false, fiscal: false, pessoal: false, certificados: false,
  procuracoes: false, vencimentos: false, parcelamentos: false, recalculos: false,
  honorarios: false, obrigacoes: false, licencas: false, certidoes: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (currentUser: User) => {
    // Check role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id);

    const isAdmin = roles?.some(r => r.role === "admin") || false;

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome_completo")
      .eq("user_id", currentUser.id)
      .single();

    if (isAdmin) {
      setUserData({
        isAdmin: true,
        modules: allModulesTrue,
        nome: profile?.nome_completo || currentUser.email || "Admin",
        email: currentUser.email || "",
      });
    } else {
      // Get module permissions
      const { data: perms } = await supabase
        .from("user_module_permissions")
        .select("module_name")
        .eq("user_id", currentUser.id);

      const moduleSet = new Set(perms?.map(p => p.module_name) || []);
      setUserData({
        isAdmin: false,
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
          obrigacoes: moduleSet.has("obrigacoes"),
          licencas: moduleSet.has("licencas"),
          certidoes: moduleSet.has("certidoes"),
        },
        nome: profile?.nome_completo || currentUser.email || "Usuário",
        email: currentUser.email || "",
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setTimeout(() => loadUserData(newSession.user), 0);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadUserData(existing.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
