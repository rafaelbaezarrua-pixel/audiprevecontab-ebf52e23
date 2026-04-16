import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileDetails } from "@/components/admin/UserProfileDetails";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    Users, Plus, Search, Filter, 
    MoreHorizontal, Edit, Shield,
    UserCircle, Mail, AlertCircle,
    ChevronLeft, ChevronRight, Download
} from "lucide-react";
import { 
    DropdownMenu, DropdownMenuContent, 
    DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const AdminUsersPage: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"equipe" | "clientes">("equipe");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Unificando dados de auth.users (via profiles) e user_roles
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    user_roles(role)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (err: any) {
            toast.error("Erro ao carregar usuários.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.nome_completo?.toLowerCase().includes(search.toLowerCase()) ||
                             u.email?.toLowerCase().includes(search.toLowerCase());
        
        const role = u.user_roles?.[0]?.role || "user";
        const isClient = role === 'client';
        
        const matchesTab = activeTab === "equipe" ? !isClient : isClient;
        
        return matchesSearch && matchesTab;
    });

    const handleOpenDetails = (user: any) => {
        setSelectedUser(user);
        setIsDetailsOpen(true);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 font-ubuntu max-w-[1600px] mx-auto">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="header-title flex items-center gap-4">
                        <Users className="text-primary" size={36} /> 
                        Gestão de Usuários
                    </h1>
                    <p className="subtitle-premium">Controle de acessos, auditoria e conformidade LGPD.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="h-12 border-border/50 gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Download size={16} /> Exportar Lista
                    </Button>
                    <Button className="button-premium h-12 px-8 gap-2 text-[10px] font-black uppercase tracking-widest">
                        <Plus size={18} /> Novo Usuário
                    </Button>
                </div>
            </div>

            {/* Statistics Row (LGPD Awareness) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total de Usuários', value: users.length, icon: UserCircle, color: 'text-blue-500' },
                    { label: 'Termos Pendentes', value: users.filter(u => !u.terms_accepted_at).length, icon: AlertCircle, color: 'text-amber-500' },
                    { label: 'Admins Ativos', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-primary' },
                    { label: 'Sessões Ativas', value: '12', icon: Mail, color: 'text-emerald-500' }
                ].map((stat, i) => (stat && (
                    <div key={i} className="card-premium !p-6 flex items-center gap-5 border-white/5 bg-card/40">
                        <div className={`w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{stat.label}</p>
                            <p className="text-2xl font-black text-card-foreground tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                )))}
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 card-premium !p-6 bg-card/20">
                <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 w-full xl:w-auto">
                    <button
                        onClick={() => setActiveTab("equipe")}
                        className={`flex-1 xl:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "equipe" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Equipe Interna ({users.filter(u => (u.user_roles?.[0]?.role || 'user') !== 'client').length})
                    </button>
                    <button
                        onClick={() => setActiveTab("clientes")}
                        className={`flex-1 xl:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "clientes" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Portal Cliente ({users.filter(u => u.user_roles?.[0]?.role === 'client').length})
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative w-full md:w-[350px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={18} />
                        <Input 
                            placeholder="BUSCAR USUÁRIO..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-12 pl-12 bg-background/50 border-border/50 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus-visible:ring-primary/20"
                        />
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card-premium overflow-hidden border-white/5 bg-card/40">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/10 border-b border-border/50">
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Usuário</th>
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Departamento</th>
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Perfil (RBAC)</th>
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Aceite LGPD</th>
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                                <th className="px-8 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-8 py-5 animate-pulse">
                                            <div className="h-6 bg-muted/20 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center opacity-30">
                                        <Users size={48} className="mx-auto mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum Usuário Encontrado</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.map((u) => (
                                <tr key={u.user_id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase shadow-inner">
                                                {u.nome_completo?.charAt(0) || u.email?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-card-foreground uppercase tracking-tight">{u.nome_completo || "Sem Nome"}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{u.departamento || "Não Vinculado"}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[9px] font-black px-3 py-1 uppercase tracking-widest">
                                            {u.role || u.user_roles?.[0]?.role || "USER"}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5">
                                        {u.terms_accepted_at ? (
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <Shield size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">v1.2 ACEITO</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <AlertCircle size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">PENDENTE</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ativo</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="hover:bg-primary/10 group">
                                                    <MoreHorizontal className="group-hover:text-primary transition-colors" size={18} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-border bg-card shadow-2xl">
                                                <DropdownMenuItem onClick={() => handleOpenDetails(u)} className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer">
                                                    <UserCircle size={16} /> Perfil Completo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer">
                                                    <Edit size={16} /> Editar Acessos
                                                </DropdownMenuItem>
                                                <div className="h-px bg-border my-2" />
                                                <DropdownMenuItem className="rounded-xl h-10 gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer text-destructive">
                                                    <AlertCircle size={16} /> Bloquear Conta
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-8 py-6 bg-muted/5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">
                        Exibindo 1 a {filteredUsers.length} de {users.length} registros
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl border-border/50">
                            <ChevronLeft size={16} />
                        </Button>
                        <div className="flex bg-muted/20 p-1 rounded-xl">
                            <Button size="sm" className="h-8 w-8 p-0 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">1</Button>
                        </div>
                        <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-xl border-border/50">
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Individual Profile Panel (Slide-over / Full-page Dialog) */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-[70vw] h-[85vh] p-0 border-none bg-transparent shadow-none overflow-hidden">
                    {selectedUser && (
                        <UserProfileDetails 
                            user={selectedUser} 
                            onClose={() => setIsDetailsOpen(false)} 
                            onUpdate={fetchUsers}
                        />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default AdminUsersPage;
