import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface UserPermissions {
  isAdmin: boolean;
  isClient: boolean;
  empresaId?: string;
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
    declaracoes_mensais: boolean;
    declaracoes_anuais: boolean;
    agendamentos: boolean;
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
  loginAsClient: (cnpj: string, password: string) => Promise<void>;
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
  honorarios: true, licencas: true, certidoes: true, declaracoes_mensais: true,
  declaracoes_anuais: true, agendamentos: true,
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      const { data: access } = await supabase
        .from("empresa_acessos")
        .select("empresa_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (profileError && profileError.name !== 'AbortError') {
        console.error("AuthProvider: Error fetching profile for user", currentUser.id, profileError);
      }

      // Robust state derivation
      const profileData = profile as any;
      const profileCompleted = profileData ? (profileData.profile_completed ?? true) : true;
      const termsAccepted = profileData ? !!profileData.terms_accepted_at : true;
      const firstAccessDone = profileData ? (profileData.first_access_done ?? true) : true;

      const metadata = currentUser.user_metadata || {};
      const isAdmin = (roles?.some(r => r.role === "admin") || profileData?.role === "admin" || metadata.role === "admin") || false;
      const isClient = (metadata.role === "client" || profileData?.role === "client" || !!access) || false;
      const empresaId = access?.empresa_id || metadata.empresa_id || profileData?.empresa_id || undefined;

      if (isAdmin) {
        setUserData({
          isAdmin: true,
          isClient: false,
          empresaId: undefined,
          userId: currentUser.id,
          modules: allModulesTrue,
          nome: profileData?.nome_completo || currentUser.user_metadata?.full_name || currentUser.email || "Admin",
          email: currentUser.email || "",
          cpf: profileData?.cpf || "",
          departamento: profileData?.departamento || "Administração",
          profileCompleted,
          termsAccepted,
          firstAccessDone,
        });
      } else {
        const { data: perms } = await supabase.from("user_module_permissions").select("module_name").eq("user_id", currentUser.id);
        const moduleSet = new Set(perms?.map(p => p.module_name) || []);
        setUserData({
          isAdmin: false,
          isClient: isClient,
          empresaId: empresaId,
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
            declaracoes_mensais: moduleSet.has("declaracoes_mensais"),
            declaracoes_anuais: moduleSet.has("declaracoes_anuais"),
            agendamentos: moduleSet.has("agendamentos"),
          },
          nome: profileData?.nome_completo || currentUser.user_metadata?.full_name || currentUser.email || "Usuário",
          email: currentUser.email || "",
          cpf: profileData?.cpf || "",
          departamento: profileData?.departamento || "",
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
    setUserData(null);
  };

  const loginAsClient = async (cnpj: string, password: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (!cleanCNPJ || cleanCNPJ.length !== 14) {
      throw new Error("CNPJ inválido. Digite os 14 números.");
    }

    const email = `${cleanCNPJ}@audipreve.com`;
    const cleanPassword = password.replace(/\D/g, "");

    // Tenta primeiro com a senha como digitada
    let { error } = await supabase.auth.signInWithPassword({ email, password });

    // Se falhar e a senha parecer um CNPJ com máscara, tenta com a senha limpa
    if (error && cleanPassword.length === 14 && password !== cleanPassword) {
      const { error: error2 } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword
      });
      if (!error2) error = null;
    }

    if (error) {
      console.error("Login Error:", error);
      if (error.message === "Invalid login credentials" || error.message === "Invalid credentials") {
        throw new Error("CNPJ ou senha inválidos. Utilize o CNPJ (apenas números) como senha inicial.");
      }
      if (error.message.includes("Email not confirmed")) {
        throw new Error("O e-mail deste acesso ainda não foi confirmado. Por favor, solicite ao administrador para sincronizar os acessos.");
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, userData, loading, login, logout, refreshUserData, loginAsClient }}>
      {children}
    </AuthContext.Provider>
  );
};
