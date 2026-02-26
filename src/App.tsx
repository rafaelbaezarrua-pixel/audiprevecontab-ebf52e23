import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import SocietarioPage from "@/pages/SocietarioPage";
import CertificadosPage from "@/pages/CertificadosPage";
import ProcuracoesPage from "@/pages/ProcuracoesPage";
import FiscalPage from "@/pages/FiscalPage";
import PessoalPage from "@/pages/PessoalPage";
import VencimentosPage from "@/pages/VencimentosPage";
import ParcelamentosPage from "@/pages/ParcelamentosPage";
import RecalculosPage from "@/pages/RecalculosPage";
import HonorariosPage from "@/pages/HonorariosPage";
import ObrigacoesPage from "@/pages/ObrigacoesPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/societario" element={<SocietarioPage />} />
              <Route path="/certificados" element={<CertificadosPage />} />
              <Route path="/procuracoes" element={<ProcuracoesPage />} />
              <Route path="/fiscal" element={<FiscalPage />} />
              <Route path="/pessoal" element={<PessoalPage />} />
              <Route path="/vencimentos" element={<VencimentosPage />} />
              <Route path="/parcelamentos" element={<ParcelamentosPage />} />
              <Route path="/recalculos" element={<RecalculosPage />} />
              <Route path="/honorarios" element={<HonorariosPage />} />
              <Route path="/obrigacoes" element={<ObrigacoesPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
