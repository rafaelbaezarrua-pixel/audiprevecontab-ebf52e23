import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Building2, FileText, Award, Clock, Calculator,
  Users, Receipt, RefreshCw, DollarSign, ClipboardList,
  LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Menu, Shield, User, Sun, Moon, Calendar
} from "lucide-react";
import logoAudipreve from "@/assets/logo-audipreve.png";
import { useTheme } from "@/components/theme-provider";
import NotificationHeader from "./NotificationHeader";

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
  { id: "ocorrencias", label: "Ocorrências", icon: <FileText size={18} />, path: "/ocorrencias", section: "GERAL" },
  { id: "societario", label: "Societário", icon: <Building2 size={18} />, path: "/societario", moduleKey: "societario", section: "DEPARTAMENTOS" },
  { id: "fiscal", label: "Fiscal", icon: <Receipt size={18} />, path: "/fiscal", moduleKey: "fiscal" },
  { id: "pessoal", label: "Pessoal", icon: <Users size={18} />, path: "/pessoal", moduleKey: "pessoal" },
  { id: "licencas", label: "Licenças", icon: <Shield size={18} />, path: "/licencas", moduleKey: "licencas", section: "CONTROLES" },
  { id: "declaracoes-anuais", label: "Declarações Anuais", icon: <ClipboardList size={18} />, path: "/declaracoes-anuais", moduleKey: "declaracoes_anuais", section: "CONTROLES" },
  { id: "certificados", label: "Certificados", icon: <Award size={18} />, path: "/certificados", moduleKey: "certificados" },
  { id: "certidoes", label: "Certidões", icon: <FileText size={18} />, path: "/certidoes", moduleKey: "certidoes" },
  { id: "procuracoes", label: "Procurações", icon: <FileText size={18} />, path: "/procuracoes", moduleKey: "procuracoes" },
  { id: "vencimentos", label: "Vencimentos", icon: <Clock size={18} />, path: "/vencimentos", moduleKey: "vencimentos" },
  { id: "parcelamentos", label: "Parcelamentos", icon: <Calculator size={18} />, path: "/parcelamentos", moduleKey: "parcelamentos" },
  { id: "recalculos", label: "Recálculos", icon: <RefreshCw size={18} />, path: "/recalculos", moduleKey: "recalculos" },
  { id: "honorarios", label: "Honorários", icon: <DollarSign size={18} />, path: "/honorarios", moduleKey: "honorarios", section: "FINANCEIRO" },
];

const AppLayout: React.FC = () => {
  const { user, userData, logout } = useAuth();
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
          fixed lg:relative z-40 h-full flex flex-col bg-sidebar border-r border-sidebar-border shadow-lg transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img src={logoAudipreve} alt="Audipreve" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-lg font-bold text-card-foreground">Audipreve</h1>
                <p className="text-xs text-sidebar-muted">{userData?.departamento || "Contabilidade"}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <img src={logoAudipreve} alt="Audipreve" className="w-10 h-10 object-contain mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-sidebar-muted hover:text-primary hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
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
                  className={`nav-item w-full ${active ? "active" : ""} ${!accessible ? "opacity-40 cursor-not-allowed" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                  disabled={!accessible}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </React.Fragment>
            );
          })}

          {userData?.isAdmin && (
            <>
              {!collapsed && <div className="menu-header">ADMINISTRAÇÃO</div>}
              <button
                onClick={() => handleNav("/configuracoes")}
                className={`nav-item w-full ${location.pathname === "/configuracoes" ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Configurações" : undefined}
              >
                <Settings size={18} />
                {!collapsed && <span>Configurações</span>}
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
            {!collapsed && <span>Meu Perfil</span>}
          </button>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-sm font-bold">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{userData?.nome}</p>
                <p className="text-xs text-sidebar-muted truncate">{userData?.isAdmin ? "Administrador" : "Usuário"}</p>
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
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-card-foreground capitalize">
                {location.pathname === "/dashboard" ? "Dashboard" : location.pathname.slice(1).replace(/-/g, " ")}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block">Sistema de Controle Contábil</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationHeader />
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors relative"
              title="Alternar Tema"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-muted-foreground" />
              ) : (
                <Moon size={18} className="text-muted-foreground" />
              )}
            </button>
            <div className="hidden sm:block px-3 py-1.5 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground capitalize">{currentDate}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
