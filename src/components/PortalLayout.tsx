import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    Building2, MessageSquare, LogOut, LayoutDashboard,
    FileText, Clock, Bell, User, Menu, X
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";

const PortalLayout: React.FC = () => {
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const menuItems = [
        { label: "Dashboard", icon: LayoutDashboard, path: "/portal" },
        { label: "Documentos", icon: FileText, path: "/portal/documentos" },
        { label: "Processos", icon: Clock, path: "/portal/processos" },
        { label: "Mensagens", icon: MessageSquare, path: "/portal/mensagens" },
    ];

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                            <Building2 size={24} />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Portal Audipreve</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${location.pathname === item.path
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-border space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User size={20} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{userData?.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">Cliente</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut size={18} className="mr-2" /> Sair
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header Mobile/Global */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 text-muted-foreground"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="font-bold text-lg md:text-xl text-card-foreground">
                            {menuItems.find(i => i.path === location.pathname)?.label || "Portal"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
                        </Button>
                        <ThemeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm animate-in fade-in">
                    <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-2xl animate-in slide-in-from-left">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <span className="font-bold text-lg">Menu</span>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-1 hover:bg-muted rounded-md"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <nav className="p-4 space-y-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${location.pathname === item.path
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted"
                                        }`}
                                >
                                    <item.icon size={20} />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalLayout;
