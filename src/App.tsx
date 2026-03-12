import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/react";
import React, { Suspense, lazy } from "react";

// Layouts
import AppLayout from "@/components/AppLayout";
const PortalLayout = lazy(() => import("@/components/PortalLayout"));

// Lazy Loaded Pages
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AuditoriaPage = lazy(() => import("@/pages/AuditoriaPage"));
const SocietarioPage = lazy(() => import("@/pages/SocietarioPage"));
const SocietarioEmpresaPage = lazy(() => import("@/pages/SocietarioEmpresaPage"));
const CertificadosPage = lazy(() => import("@/pages/CertificadosPage"));
const CertidoesPage = lazy(() => import("@/pages/CertidoesPage"));
const LicencasPage = lazy(() => import("@/pages/LicencasPage"));
const ProcuracoesPage = lazy(() => import("@/pages/ProcuracoesPage"));
const FiscalPage = lazy(() => import("@/pages/FiscalPage"));
const PessoalPage = lazy(() => import("@/pages/PessoalPage"));
const VencimentosPage = lazy(() => import("@/pages/VencimentosPage"));
const ParcelamentosPage = lazy(() => import("@/pages/ParcelamentosPage"));
const ParcelamentoFormPage = lazy(() => import("@/pages/ParcelamentoFormPage"));
const RecalculosPage = lazy(() => import("@/pages/RecalculosPage"));
const HonorariosPage = lazy(() => import("@/pages/HonorariosPage"));
const DeclaracoesMensaisPage = lazy(() => import("@/pages/DeclaracoesMensaisPage"));
const DeclaracoesAnuaisPage = lazy(() => import("@/pages/DeclaracoesAnuaisPage"));
const AgendamentosPage = lazy(() => import("@/pages/AgendamentosPage"));
const AgendamentoFormPage = lazy(() => import("@/pages/AgendamentoFormPage"));
const UsuarioFormPage = lazy(() => import("@/pages/UsuarioFormPage"));
const OcorrenciasPage = lazy(() => import("@/pages/OcorrenciasPage"));
const ConfiguracoesPage = lazy(() => import("@/pages/ConfiguracoesPage"));
const CompletarPerfilPage = lazy(() => import("@/pages/CompletarPerfilPage"));
const TermosPage = lazy(() => import("@/pages/TermosPage"));
const PerfilPage = lazy(() => import("@/pages/PerfilPage"));
const IRPFPage = lazy(() => import("@/pages/IRPFPage"));
const NotificacoesPage = lazy(() => import("@/pages/NotificacoesPage"));
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"));
const VerificationPage = lazy(() => import("@/pages/VerificationPage"));
const EsqueciSenhaPage = lazy(() => import("@/pages/EsqueciSenhaPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PortalDashboardPage = lazy(() => import("@/pages/PortalDashboardPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const ClientLoginPage = lazy(() => import("@/pages/ClientLoginPage"));
const PortalLicencasPage = lazy(() => import("@/pages/PortalLicencasPage"));
const PortalCertidoesPage = lazy(() => import("@/pages/PortalCertidoesPage"));
const PortalVencimentosPage = lazy(() => import("@/pages/PortalVencimentosPage"));
const PortalPerfilPage = lazy(() => import("@/pages/PortalPerfilPage"));
const PortalProcessosPage = lazy(() => import("@/pages/PortalProcessosPage"));
const PortalDocumentosPage = lazy(() => import("@/pages/PortalDocumentosPage"));

const queryClient = new QueryClient();

// Loading Component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userData } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (userData && !userData.isClient && !userData.profileCompleted) {
    return <Navigate to="/completar-perfil" replace />;
  }

  if (userData && !userData.isClient && userData.profileCompleted && !userData.termsAccepted) {
    return <Navigate to="/termos" replace />;
  }

  if (userData && !userData.isClient && userData.termsAccepted && !userData.firstAccessDone) {
    return <Navigate to="/verificacao" replace />;
  }

  // Redirect clients to portal if they try to access internal app
  if (userData?.isClient && !window.location.pathname.startsWith("/portal")) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userData } = useAuth();
  if (loading) return null;
  if (!user || !userData?.isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, userData } = useAuth();
  if (loading) return null;
  if (!user || (!userData?.isClient && !userData?.isAdmin)) return <Navigate to="/login" replace />;

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
        <SpeedInsights />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/portal/login" element={<ClientLoginPage />} />
                <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/completar-perfil" element={<OnboardingRoute><CompletarPerfilPage /></OnboardingRoute>} />
                <Route path="/termos" element={<OnboardingRoute><TermosPage /></OnboardingRoute>} />
                <Route path="/verificacao" element={<OnboardingRoute><VerificationPage /></OnboardingRoute>} />
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
                  <Route path="/declaracoes-mensais" element={<DeclaracoesMensaisPage />} />
                  <Route path="/declaracoes-anuais" element={<DeclaracoesAnuaisPage />} />
                  <Route path="/irpf" element={<IRPFPage />} />
                  <Route path="/relatorios" element={<RelatoriosPage />} />
                  <Route path="/agendamentos" element={<AgendamentosPage />} />
                  <Route path="/agendamentos/novo" element={<AgendamentoFormPage />} />
                  <Route path="/ocorrencias" element={<OcorrenciasPage />} />
                  <Route path="/configuracoes/usuarios/novo" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
                  <Route path="/perfil" element={<PerfilPage />} />
                  <Route path="/notificacoes" element={<NotificacoesPage />} />
                  <Route path="/configuracoes" element={<AdminRoute><ConfiguracoesPage /></AdminRoute>} />
                  <Route path="/configuracoes/auditoria" element={<AdminRoute><AuditoriaPage /></AdminRoute>} />
                </Route>

                {/* Portal do Cliente Routes */}
                <Route element={<ClientRoute><PortalLayout /></ClientRoute>}>
                  <Route path="/portal" element={<PortalDashboardPage />} />
                  <Route path="/portal/licencas" element={<PortalLicencasPage />} />
                  <Route path="/portal/certidoes" element={<PortalCertidoesPage />} />
                  <Route path="/portal/vencimentos" element={<PortalVencimentosPage />} />
                  <Route path="/portal/perfil" element={<PortalPerfilPage />} />
                  <Route path="/portal/documentos" element={<PortalDocumentosPage />} />
                  <Route path="/portal/processos" element={<PortalProcessosPage />} />
                  <Route path="/portal/mensagens" element={<MessagesPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
