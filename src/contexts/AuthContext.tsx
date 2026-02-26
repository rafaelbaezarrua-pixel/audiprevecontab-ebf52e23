import React, { createContext, useContext, useEffect, useState } from "react";
import { User, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, ref, onValue } from "@/lib/firebase";

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
  };
  nome?: string;
  email?: string;
  departamento?: string;
}

interface AuthContextType {
  user: User | null;
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

const defaultPermissions: UserPermissions = {
  isAdmin: false,
  modules: {
    societario: false,
    fiscal: false,
    pessoal: false,
    certificados: false,
    procuracoes: false,
    vencimentos: false,
    parcelamentos: false,
    recalculos: false,
    honorarios: false,
    obrigacoes: false,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userRef = ref(db, `usuarios/${firebaseUser.uid}`);
        onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData({
              isAdmin: data.isAdmin || false,
              modules: {
                societario: data.isAdmin || data.modules?.societario || false,
                fiscal: data.isAdmin || data.modules?.fiscal || false,
                pessoal: data.isAdmin || data.modules?.pessoal || false,
                certificados: data.isAdmin || data.modules?.certificados || false,
                procuracoes: data.isAdmin || data.modules?.procuracoes || false,
                vencimentos: data.isAdmin || data.modules?.vencimentos || false,
                parcelamentos: data.isAdmin || data.modules?.parcelamentos || false,
                recalculos: data.isAdmin || data.modules?.recalculos || false,
                honorarios: data.isAdmin || data.modules?.honorarios || false,
                obrigacoes: data.isAdmin || data.modules?.obrigacoes || false,
              },
              nome: data.nome || firebaseUser.displayName || "Usuário",
              email: data.email || firebaseUser.email || "",
              departamento: data.departamento || "",
            });
          } else {
            setUserData({ ...defaultPermissions, nome: firebaseUser.displayName || "Usuário", email: firebaseUser.email || "" });
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
