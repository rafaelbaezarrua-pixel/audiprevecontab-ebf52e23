import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Calendar, Clock, User, Plus, Save, X, ClipboardList, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Agendamento {
    id: string;
    data: string;
    horario: string;
    usuario_id: string;
    criado_por: string;
    assunto: string;
    informacoes_adicionais: string;
    competencia: string;
    usuario_nome?: string;
}

const AgendamentosPage: React.FC = () => {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<"geral" | "meus">("geral");

    const loadData = async () => {
        setLoading(true);
        try {
            // Carregar usuários para mapear nomes
            const { data: usersData } = await (supabase.from("profiles").select("id, full_name, user_id") as any);
            const mappedUsers = (usersData || []).map((u: any) => ({
                id: u.user_id || u.id,
                nome: u.full_name || "Sem Nome"
            }));

            // Carregar agendamentos
            const { data: agendaData } = await (supabase
                .from("agendamentos" as any)
                .select("*")
                .eq("competencia", competencia) as any);

            const enrichedData = (agendaData || []).map((a: any) => ({
                ...a,
                usuario_nome: mappedUsers.find(u => u.id === a.usuario_id)?.nome || "Não encontrado"
            }));

            setAgendamentos(enrichedData);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [competencia]);

    const filtered = agendamentos.filter(a => {
        const matchSearch = a.assunto.toLowerCase().includes(search.toLowerCase()) ||
            a.usuario_nome?.toLowerCase().includes(search.toLowerCase());
        const matchTab = activeTab === "geral" ? true : a.usuario_id === user?.id;
        return matchSearch && matchTab;
    });

    if (loading && agendamentos.length === 0) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Agendamentos</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gestão de reuniões e compromissos</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={competencia}
                        onChange={e => setCompetencia(e.target.value)}
                        className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                    />
                    <button
                        onClick={() => navigate("/agendamentos/novo")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md transition-all hover:scale-105"
                        style={{ background: "var(--gradient-primary)" }}
                    >
                        <Plus size={18} /> Novo Agendamento
                    </button>
                </div>
            </div>

            <div className="flex border-b border-border">
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "geral" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("geral")}
                >
                    Geral
                </button>
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "meus" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setActiveTab("meus")}
                >
                    Meus Agendamentos
                </button>
            </div>

            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar agendamento ou usuário..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        Nenhum agendamento encontrado para este período.
                    </div>
                ) : (
                    filtered.map(a => (
                        <div key={a.id} className="module-card p-5 space-y-4 hover:shadow-lg transition-all border-l-4 border-l-primary">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-card-foreground leading-tight">{a.assunto}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <User size={12} /> Para: <span className="text-foreground font-medium">{a.usuario_nome}</span>
                                    </p>
                                </div>
                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                    <Calendar size={18} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar size={14} className="text-primary" />
                                    {format(new Date(a.data + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock size={14} className="text-primary" />
                                    {a.horario.slice(0, 5)}
                                </div>
                            </div>

                            {a.informacoes_adicionais && (
                                <div className="bg-muted/30 p-3 rounded-lg text-xs text-muted-foreground border border-border italic">
                                    {a.informacoes_adicionais}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AgendamentosPage;
