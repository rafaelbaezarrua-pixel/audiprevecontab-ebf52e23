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
import SocietarioEmpresaPage from "@/pages/SocietarioEmpresaPage";
import CertificadosPage from "@/pages/CertificadosPage";
import CertidoesPage from "@/pages/CertidoesPage";
import LicencasPage from "@/pages/LicencasPage";
import ProcuracoesPage from "@/pages/ProcuracoesPage";
import FiscalPage from "@/pages/FiscalPage";
import PessoalPage from "@/pages/PessoalPage";
import VencimentosPage from "@/pages/VencimentosPage";
import ParcelamentosPage from "@/pages/ParcelamentosPage";
import ParcelamentoFormPage from "@/pages/ParcelamentoFormPage";
import RecalculosPage from "@/pages/RecalculosPage";
import HonorariosPage from "@/pages/HonorariosPage";
import DeclaracoesAnuaisPage from "@/pages/DeclaracoesAnuaisPage";
import AgendamentosPage from "@/pages/AgendamentosPage";
import AgendamentoFormPage from "@/pages/AgendamentoFormPage";
import UsuarioFormPage from "@/pages/UsuarioFormPage";
// Comentário para forçar atualização do IDE

import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import CompletarPerfilPage from "@/pages/CompletarPerfilPage";
import TermosPage from "@/pages/TermosPage";
import PerfilPage from "@/pages/PerfilPage";
import NotFound from "@/pages/NotFound";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userData } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Redirect to profile completion if not completed
  if (userData && !userData.profileCompleted) {
    return <Navigate to="/completar-perfil" replace />;
  }

  // Redirect to terms if profile completed but terms not accepted
  if (userData && userData.profileCompleted && !userData.termsAccepted) {
    return <Navigate to="/termos" replace />;
  }

  return <>{children}</>;
};

const OnboardingRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider defaultTheme="dark" storageKey="audipreve-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/completar-perfil" element={<OnboardingRoute><CompletarPerfilPage /></OnboardingRoute>} />
              <Route path="/termos" element={<OnboardingRoute><TermosPage /></OnboardingRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/societario" element={<SocietarioPage />} />
                <Route path="/societario/:id" element={<SocietarioEmpresaPage />} />
                <Route path="/societario/:id/editar" element={<SocietarioEmpresaPage />} />
                <Route path="/licencas" element={<LicencasPage />} />
                <Route path="/certificados" element={<CertificadosPage />} />
                <Route path="/certidoes" element={<CertidoesPage />} />
                <Route path="/procuracoes" element={<ProcuracoesPage />} />
                <Route path="/fiscal" element={<FiscalPage />} />
                <Route path="/pessoal" element={<PessoalPage />} />
                <Route path="/vencimentos" element={<VencimentosPage />} />
                <Route path="/parcelamentos" element={<ParcelamentosPage />} />
                <Route path="/parcelamentos/novo" element={<ParcelamentoFormPage />} />
                <Route path="/recalculos" element={<RecalculosPage />} />
                <Route path="/honorarios" element={<HonorariosPage />} />
                <Route path="/declaracoes-anuais" element={<DeclaracoesAnuaisPage />} />
                <Route path="/agendamentos" element={<AgendamentosPage />} />
                <Route path="/agendamentos/novo" element={<AgendamentoFormPage />} />
                <Route path="/configuracoes/usuarios/novo" element={<UsuarioFormPage />} />

                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
