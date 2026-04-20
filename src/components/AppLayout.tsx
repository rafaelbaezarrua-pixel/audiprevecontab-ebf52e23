import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Building2, FileText, Award, Clock, Calculator,
  Users, Receipt, RefreshCw, DollarSign, ClipboardList,
  LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Menu, Shield, User, Calendar, Database, FileSignature
} from "lucide-react";
import { useAppConfig } from "@/hooks/useAppConfig";
import logoAudipreve from "@/assets/logo-audipreve.png";
import { useTheme } from "@/components/theme-provider";
import NotificationHeader from "./NotificationHeader";
import { GlobalSearch } from "./GlobalSearch";
import { ThemeToggle } from "./ThemeToggle";
import { ColorCustomizer } from "./ColorCustomizer";
import { DEFAULT_NAV_ITEMS, NavItemConfig } from "@/constants/navigation";

import { AlertasInteligentesProvider } from "@/contexts/AlertasInteligentesProvider";
import { formatDateBR } from "@/lib/utils";

const AppLayout: React.FC = () => {
  const { user, userData, logout, toggleFavorito } = useAuth();
  const { config } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (config?.system_title) {
      document.title = config.system_title;
    }
  }, [config]);
  
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

  const currentDate = formatDateBR(new Date().toISOString());

  // Compute dynamic nav items based on user configuration
  const displayNavItems = React.useMemo(() => {
    if (!userData?.sidebar_config || userData.sidebar_config.length === 0) {
      return DEFAULT_NAV_ITEMS;
    }

    const config = userData.sidebar_config;
    const sortedItems: NavItemConfig[] = [];

    // Map existing nav items for quick lookup
    const defaultItemsMap = new Map(DEFAULT_NAV_ITEMS.map(item => [item.id, item]));

    // Add items from user config
    config.forEach((cItem: any) => {
      const baseItem = defaultItemsMap.get(cItem.id);
      if (baseItem && !cItem.hidden) {
        sortedItems.push({
          ...baseItem,
          label: cItem.label || baseItem.label,
          section: cItem.section !== undefined ? cItem.section : baseItem.section,
          color: cItem.color
        });
      }
    });

    // Add any missing items from default (new modules)
    DEFAULT_NAV_ITEMS.forEach(dItem => {
      if (!config.find((c: any) => c.id === dItem.id)) {
        sortedItems.push(dItem);
      }
    });

    return sortedItems;
  }, [userData?.sidebar_config]);

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
              <div className="h-9 w-9 flex items-center justify-center">
                <img 
                  src={config.system_logo_url || logoAudipreve} 
                  alt={config.system_title} 
                  className="w-8 h-8 object-contain brightness-0 dark:invert" 
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-card-foreground tracking-tight">{config.system_title}</h1>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Contabilidade</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-9 w-9 mx-auto flex items-center justify-center">
              <img 
                src={config.system_logo_url || logoAudipreve} 
                alt={config.system_title} 
                className="w-8 h-8 object-contain mx-auto brightness-0 dark:invert" 
              />
            </div>
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
              {displayNavItems
                .filter(item => (userData.favoritos || []).includes(item.id) && hasAccess(item.moduleKey))
                .map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <div className="relative group/nav w-full mb-0.5" key={`fav-${item.id}`}>
                      <button
                        onClick={() => handleNav(item.path)}
                        className={`nav-item w-full group relative ${active ? "active" : ""} hover:text-[var(--item-color)] active:text-[var(--item-color)]`}
                        style={{ 
                          "--item-color": item.color || "hsl(var(--primary))",
                          color: active ? (item.color || "hsl(var(--primary))") : undefined
                        } as React.CSSProperties}
                        aria-label={item.label}
                      >
                        <div 
                          className="transition-all duration-300 group-hover:scale-110"
                          style={{ color: active ? item.color : undefined }}
                        >
                          {item.icon}
                        </div>
                        <span 
                          className="flex-1 text-left whitespace-nowrap truncate transition-colors duration-300"
                          style={{ color: active ? item.color : undefined }}
                        >
                          {item.label}
                        </span>
                        {active && (
                          <div 
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" 
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          {displayNavItems.map((item) => {
            const hasSection = !!item.section;
            const showSection = hasSection && item.section !== lastSection;
            if (hasSection) lastSection = item.section!;
            else if (!item.section && lastSection) lastSection = ""; // Reset if section removed
            const accessible = hasAccess(item.moduleKey);
            const active = location.pathname === item.path;

            return (
              <React.Fragment key={item.id}>
                {showSection && !collapsed && <div className="menu-header">{item.section}</div>}
                <button
                  onClick={() => accessible && handleNav(item.path)}
                  className={`nav-item w-full group relative ${active ? "active" : ""} ${!accessible ? "opacity-30 cursor-not-allowed" : ""} ${collapsed ? "justify-center px-0 h-11 w-11 mx-auto" : ""} hover:text-[var(--item-color)] active:text-[var(--item-color)]`}
                  style={{ 
                    "--item-color": item.color || "hsl(var(--primary))",
                    color: active ? (item.color || "hsl(var(--primary))") : undefined
                  } as React.CSSProperties}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                >
                  <div 
                    className="transition-all duration-300 group-hover:scale-110"
                    style={{ color: active ? item.color : undefined }}
                  >
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <span 
                      className="flex-1 text-left whitespace-nowrap truncate transition-colors duration-300"
                      style={{ color: active ? item.color : undefined }}
                    >
                      {item.label}
                    </span>
                  )}
                  {active && !collapsed && (
                    <div 
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" 
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
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
                <p className="text-xs text-sidebar-muted truncate leading-tight">
                  {userData?.isAdmin ? "Administrador" : userData?.isTeamMember ? "Equipe" : "Portal Cliente"}
                </p>
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
        <header className="bg-background border-b border-border px-4 lg:px-8 py-4 flex items-center justify-between flex-shrink-0">
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
              <p className="text-xs font-bold text-muted-foreground">{currentDate.toLowerCase()}</p>
            </div>

            <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <NotificationHeader />
              <div className="flex items-center gap-1 px-1 bg-muted/30 rounded-full border border-border/40">
                <ColorCustomizer />
                <div className="w-[1px] h-4 bg-border/60 mx-1"></div>
                <ThemeToggle />
              </div>
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
