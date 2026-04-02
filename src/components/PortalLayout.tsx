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
        <div className="min-h-screen bg-background flex flex-col md:flex-row">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border sticky top-0 h-screen overflow-y-auto">
                <div className="p-6 border-b border-border mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">A</div>
                        <span className="font-bold text-xl tracking-tight">Audipreve</span>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Portal do Cliente</p>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${location.pathname === item.path
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            <item.icon size={18} />
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
            <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">A</div>
                    <span className="font-bold">Audipreve</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1 bg-muted/30 rounded-full border border-border/40 scale-90">
                        <ColorCustomizer />
                        <div className="w-[1px] h-4 bg-border/60 mx-1"></div>
                        <ThemeToggle />
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
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
            <main className="flex-1 flex flex-col min-w-0">
                <header className="hidden md:flex items-center justify-between px-8 py-4 bg-background border-b border-border/50 sticky top-0 z-30">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Pesquisar no portal..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-muted/50 border border-transparent focus:bg-background focus:border-primary/30 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 px-1 bg-muted/30 rounded-full border border-border/40">
                            <ColorCustomizer />
                            <div className="w-[1px] h-4 bg-border/60 mx-1"></div>
                            <ThemeToggle />
                        </div>
                        <button className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all relative">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
                        </button>

                        <div className="h-6 w-px bg-border mx-2"></div>

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
