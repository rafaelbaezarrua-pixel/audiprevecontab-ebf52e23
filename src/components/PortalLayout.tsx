import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, MessageSquare, LogOut, LayoutDashboard, FileText, Briefcase,
    Menu, X, Bell, User, UserCircle,
    ScrollText, FileBadge, CalendarClock, Search
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ColorCustomizer } from "./ColorCustomizer";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PortalLayout: React.FC = () => {
    const { user, userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/portal/login");
    };

    const menuItems = [
        { title: "Dashboard", icon: LayoutDashboard, path: "/portal" },
        { title: "Licenças", icon: ScrollText, path: "/portal/licencas" },
        { title: "Certidões", icon: FileBadge, path: "/portal/certidoes" },
        { title: "Processos", icon: Briefcase, path: "/portal/processos" },
        { title: "Documentos", icon: FileText, path: "/portal/documentos" },
        { title: "Vencimentos", icon: CalendarClock, path: "/portal/vencimentos" },
        { title: "Mensagens", icon: MessageSquare, path: "/portal/mensagens" },
        { title: "Help Desk", icon: MessageSquare, path: "/portal/helpdesk" },
        { title: "Meu Perfil", icon: UserCircle, path: "/portal/perfil" },
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col md:flex-row font-body leading-relaxed transition-colors duration-500">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex w-68 flex-col glass-sidebar sticky top-0 h-screen overflow-y-auto">
                <div className="p-6 border-b border-border mb-2">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">A</div>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-foreground">Audipreve</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Portal do Cliente</p>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all group ${location.pathname === item.path
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "text-muted-foreground/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                }`}
                        >
                            <item.icon size={18} className="shrink-0" />
                            {item.title}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-border bg-muted/20">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                        <LogOut size={18} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 glass-header sticky top-0 z-50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black">A</div>
                    <span className="font-black text-lg tracking-tighter uppercase">Audipreve</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1 bg-black/5 dark:bg-white/5 rounded-full border border-border/20 scale-90">
                        <ColorCustomizer />
                        <div className="w-[1px] h-4 bg-border/20 mx-1"></div>
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[65px] z-40 bg-background/95 backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                    <nav className="p-6 space-y-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-4 p-4 rounded-2xl text-base font-semibold transition-all ${location.pathname === item.path
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-card border border-border text-muted-foreground"
                                    }`}
                            >
                                <item.icon size={20} />
                                {item.title}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 w-full p-4 rounded-2xl text-base font-semibold text-destructive bg-destructive/5 border border-destructive/10 mt-4"
                        >
                            <LogOut size={20} />
                            Sair da Conta
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                <header className="hidden md:flex items-center justify-between px-8 py-4 glass-header sticky top-0 z-30 backdrop-blur-xl">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="PESQUISAR NO PORTAL..."
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border/20 focus:ring-1 focus:ring-primary/40 outline-none transition-all text-[11px] font-bold uppercase tracking-widest placeholder:text-muted-foreground/20"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 px-1 bg-black/5 dark:bg-white/5 rounded-full border border-border/20">
                            <ColorCustomizer />
                            <div className="w-[1px] h-4 bg-border/20 mx-1"></div>
                            <ThemeToggle />
                        </div>
                        <button className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-muted-foreground transition-all relative">
                            <Bell size={18} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
                        </button>

                        <div className="h-6 w-px bg-border/20 mx-2"></div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-3 p-1.5 pr-3 rounded-xl bg-muted/30 hover:bg-muted transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <User size={18} />
                                    </div>
                                    <div className="text-left hidden lg:block">
                                        <p className="text-xs font-bold leading-tight truncate max-w-[120px]">{userData?.nome || "Empresa"}</p>
                                        <p className="text-[10px] text-muted-foreground leading-tight truncate">Portal</p>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-border/50">
                                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate("/portal/perfil")} className="rounded-lg gap-3 py-2 cursor-pointer">
                                    <UserCircle size={16} /> Ver Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate("/portal/mensagens")} className="rounded-lg gap-3 py-2 cursor-pointer">
                                    <MessageSquare size={16} /> Mensagens
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="rounded-lg gap-3 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <LogOut size={16} /> Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <div className="p-4 md:p-8 flex-1 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default PortalLayout;
