import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Building2, FileText, Award, Clock, Calculator,
  Users, Receipt, RefreshCw, DollarSign, ClipboardList,
  LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Menu, Shield, User, Calendar, Database, FileSignature
} from "lucide-react";
import logoAudipreve from "@/assets/logo-audipreve.png";
import { useTheme } from "@/components/theme-provider";
import NotificationHeader from "./NotificationHeader";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";

import { AlertasInteligentesProvider } from "@/contexts/AlertasInteligentesProvider";

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  moduleKey?: string;
  section?: string;
}

const navItems: NavItemConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/dashboard", section: "GERAL" },
  { id: "agendamentos", label: "Agendamentos", icon: <Calendar size={18} />, path: "/agendamentos", moduleKey: "agendamentos", section: "GERAL" },
  { id: "tarefas", label: "Tarefas", icon: <ClipboardList size={18} />, path: "/tarefas", moduleKey: "tarefas", section: "GERAL" },
  { id: "ocorrencias", label: "Ocorrências", icon: <FileText size={18} />, path: "/ocorrencias", moduleKey: "ocorrencias", section: "GERAL" },
  { id: "documentos", label: "Assinaturas", icon: <FileSignature size={18} />, path: "/documentos", moduleKey: "documentos", section: "GERAL" },
  { id: "recibos", label: "Recibos", icon: <Receipt size={18} />, path: "/recibos", moduleKey: "recibos", section: "GERAL" },
  { id: "faturamento", label: "Faturamento", icon: <DollarSign size={18} />, path: "/faturamento", moduleKey: "faturamento", section: "GERAL" },
  { id: "societario", label: "Societário", icon: <Building2 size={18} />, path: "/societario", moduleKey: "societario", section: "DEPARTAMENTOS" },
  { id: "fiscal", label: "Fiscal", icon: <Receipt size={18} />, path: "/fiscal", moduleKey: "fiscal" },
  { id: "pessoal", label: "Pessoal", icon: <Users size={18} />, path: "/pessoal", moduleKey: "pessoal" },
  { id: "simulador", label: "Simulador", icon: <Calculator size={18} />, path: "/pessoal/simulador", moduleKey: "simulador", section: "DEPARTAMENTOS" },
  { id: "licencas", label: "Licenças", icon: <Shield size={18} />, path: "/licencas", moduleKey: "licencas", section: "CONTROLES" },
  { id: "declaracoes-mensais", label: "Declarações Mensais", icon: <ClipboardList size={18} />, path: "/declaracoes-mensais", moduleKey: "declaracoes_mensais", section: "CONTROLES" },
  { id: "declaracoes-anuais", label: "Declarações Anuais", icon: <ClipboardList size={18} />, path: "/declaracoes-anuais", moduleKey: "declaracoes_anuais" },
  { id: "irpf", label: "IRPF", icon: <Calculator size={18} />, path: "/irpf", moduleKey: "irpf", section: "CONTROLES" },
  { id: "certificados", label: "Certificados", icon: <Award size={18} />, path: "/certificados", moduleKey: "certificados" },
  { id: "certidoes", label: "Certidões", icon: <FileText size={18} />, path: "/certidoes", moduleKey: "certidoes" },
  { id: "procuracoes", label: "Procurações", icon: <FileText size={18} />, path: "/procuracoes", moduleKey: "procuracoes" },
  { id: "vencimentos", label: "Vencimentos", icon: <Clock size={18} />, path: "/vencimentos", moduleKey: "vencimentos" },
  { id: "parcelamentos", label: "Parcelamentos", icon: <Calculator size={18} />, path: "/parcelamentos", moduleKey: "parcelamentos" },
  { id: "recalculos", label: "Recálculos", icon: <RefreshCw size={18} />, path: "/recalculos", moduleKey: "recalculos" },
  { id: "honorarios", label: "Honorários", icon: <DollarSign size={18} />, path: "/honorarios", moduleKey: "honorarios", section: "FINANCEIRO" },
  { id: "relatorios", label: "Relatórios", icon: <FileText size={18} />, path: "/relatorios", moduleKey: "relatorios" },
];

const AppLayout: React.FC = () => {
  const { user, userData, logout, toggleFavorito } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const hasAccess = (moduleKey?: string) => {
    if (!moduleKey) return true;
    if (userData?.isAdmin) return true;
    return userData?.modules?.[moduleKey as keyof typeof userData.modules] ?? false;
  };

  const initials = (userData?.nome || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const currentDate = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  let lastSection = "";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-40 h-full flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300
          ${collapsed ? "w-20" : "w-[220px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img src={logoAudipreve} alt="Audipreve" className="w-9 h-9 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-card-foreground tracking-tight">Audipreve</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70">Contabilidade</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src={logoAudipreve} alt="Audipreve" className="w-9 h-9 object-contain mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-sidebar-muted hover:text-primary hover:bg-sidebar-accent transition-all border border-transparent hover:border-sidebar-border shadow-sm"
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {/* Favoritos Section */}
          {!collapsed && userData && userData.favoritos && userData.favoritos.length > 0 && (
            <div className="mb-4">
              <div className="menu-header flex items-center gap-2">
                FAVORITOS
              </div>
              {navItems
                .filter(item => (userData.favoritos || []).includes(item.id) && hasAccess(item.moduleKey))
                .map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <div className="relative group/nav w-full mb-0.5" key={`fav-${item.id}`}>
                      <button
                        onClick={() => handleNav(item.path)}
                        className={`nav-item w-full group relative ${active ? "active" : ""}`}
                        aria-label={item.label}
                      >
                        <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? "text-primary" : ""}`}>
                          {item.icon}
                        </div>
                        <span className="flex-1 text-left whitespace-nowrap truncate">{item.label}</span>
                        {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" />}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {navItems.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;
            const accessible = hasAccess(item.moduleKey);
            const active = location.pathname === item.path;

            return (
              <React.Fragment key={item.id}>
                {showSection && !collapsed && <div className="menu-header">{item.section}</div>}
                <button
                  onClick={() => accessible && handleNav(item.path)}
                  className={`nav-item w-full group relative ${active ? "active" : ""} ${!accessible ? "opacity-30 cursor-not-allowed" : ""} ${collapsed ? "justify-center px-0 h-11 w-11 mx-auto" : ""}`}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                >
                  <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? "text-primary" : ""}`}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="flex-1 text-left whitespace-nowrap truncate">{item.label}</span>}
                  {active && !collapsed && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" />}
                </button>
              </React.Fragment>
            );
          })}

          {userData?.isAdmin && (
            <>
              {!collapsed && <div className="menu-header">Contabilidade</div>}
              <button
                onClick={() => handleNav("/configuracoes")}
                className={`nav-item w-full ${location.pathname === "/configuracoes" ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Configurações" : undefined}
                aria-label="Configurações"
              >
                <Settings size={18} />
                {!collapsed && <span className="whitespace-nowrap truncate">Configurações</span>}
              </button>
              <button
                onClick={() => handleNav("/configuracoes/alertas")}
                className={`nav-item w-full ${location.pathname === "/configuracoes/alertas" ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Gestor de Alertas" : undefined}
                aria-label="Gestor de Alertas"
              >
                <Bell size={18} />
                {!collapsed && <span className="whitespace-nowrap truncate">Gestor de Alertas</span>}
              </button>
              <button
                onClick={() => handleNav("/configuracoes/auditoria")}
                className={`nav-item w-full ${location.pathname === "/configuracoes/auditoria" ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Auditoria do Sistema" : undefined}
                aria-label="Auditoria do Sistema"
              >
                <Database size={18} />
                {!collapsed && <span className="whitespace-nowrap truncate">Auditoria</span>}
              </button>
            </>
          )}

        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => handleNav("/perfil")}
            className={`nav-item w-full ${location.pathname === "/perfil" ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
            title={collapsed ? "Meu Perfil" : undefined}
          >
            <User size={18} />
            {!collapsed && <span className="whitespace-nowrap truncate">Meu Perfil</span>}
          </button>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/50">
              {userData?.foto_url ? (
                <img src={userData.foto_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-sm font-bold">{initials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate leading-tight">{userData?.nome || '\u00A0'}</p>
                <p className="text-xs text-sidebar-muted truncate leading-tight">{userData?.isAdmin ? "Administrador" : "Usuário"}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="text-sidebar-muted hover:text-destructive transition-colors" title="Sair">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-background border-b border-border px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:shadow-sm transition-all"
              aria-label="Abrir menu lateral"
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-2">
              <GlobalSearch />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-muted/40 border border-transparent hover:border-border rounded-xl transition-all cursor-default">
              <Calendar size={14} className="text-primary" />
              <p className="text-xs font-bold text-muted-foreground capitalize">{currentDate}</p>
            </div>

            <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <NotificationHeader />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AlertasInteligentesProvider>
            <Outlet />
          </AlertasInteligentesProvider>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
