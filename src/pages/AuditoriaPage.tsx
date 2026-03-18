import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, Eye, Database, List as ListIcon, X } from "lucide-react";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";

interface AuditLog {
    id: string;
    created_at: string;
    user_id: string | null;
    action: string;
    table_name: string;
    record_id: string;
    old_data: any;
    new_data: any;
    profile?: { nome_completo: string | null; email: string | null };
}

const AuditoriaPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterTable, setFilterTable] = useState("all");
    const [filterAction, setFilterAction] = useState("all");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        // Join with profiles to get the user name
        const { data: logsData, error } = await supabase
            .from("audit_logs")
            .select(`
        *,
        profile:profiles(nome_completo, email)
      `)
            .order("created_at", { ascending: false })
            .limit(500);

        if (!error && logsData) {
            setLogs(logsData as unknown as AuditLog[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLogs();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('audit_log_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'audit_logs'
                },
                (payload) => {
                    console.log('New audit log received:', payload);
                    const newLog = payload.new as unknown as AuditLog;
                    
                    // Fetch profile for the new log to show name
                    supabase
                        .from("profiles")
                        .select("nome_completo, email")
                        .eq("user_id", newLog.user_id)
                        .maybeSingle()
                        .then(({ data: profile }) => {
                            const logWithProfile = { ...newLog, profile: profile as any };
                            setLogs(prev => [logWithProfile, ...prev].slice(0, 500));
                        });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const tables = Array.from(new Set(logs.map(l => l.table_name)));

    const filteredLogs = logs.filter(log => {
        const searchLower = search.toLowerCase();
        const userName = log.profile?.nome_completo?.toLowerCase() || "";
        const email = log.profile?.email?.toLowerCase() || "";
        const matchesSearch = 
            userName.includes(searchLower) || 
            email.includes(searchLower) ||
            log.table_name.toLowerCase().includes(searchLower) || 
            log.action.toLowerCase().includes(searchLower);
        
        const matchesTable = filterTable === "all" || log.table_name === filterTable;
        const matchesAction = filterAction === "all" || log.action === filterAction;

        return matchesSearch && matchesTable && matchesAction;
    });

    const getActionColor = (action: string) => {
        switch (action) {
            case 'INSERT': return 'bg-success/10 text-success border-success/20';
            case 'UPDATE': return 'bg-warning/10 text-warning border-warning/20';
            case 'DELETE': return 'bg-destructive/10 text-destructive border-destructive/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeaderSkeleton />
                <TableSkeleton rows={10} />
            </div>
        );
    }
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Database size={20} className="text-primary" />
                    <h1 className="text-2xl font-black text-card-foreground tracking-tight">Registro de Auditoria</h1>
                </div>
                <div className="flex items-center gap-2 bg-success/10 text-success text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-success/20 shadow-sm animate-pulse-slow">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Live Feed Ativo
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between module-card">
                <div className="relative flex-1 w-full max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por usuário ou tabela..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                            className="w-full pl-8 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm font-medium appearance-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="all">Ação: Todas</option>
                            <option value="INSERT">Inserções (INSERT)</option>
                            <option value="UPDATE">Edições (UPDATE)</option>
                            <option value="DELETE">Exclusões (DELETE)</option>
                        </select>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                        <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={filterTable}
                            onChange={e => setFilterTable(e.target.value)}
                            className="w-full pl-8 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm font-medium appearance-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="all">Tabela: Todas</option>
                            {tables.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="module-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data e Hora</th>
                                <th>Usuário</th>
                                <th>Tabela</th>
                                <th>Ação</th>
                                <th className="text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <ListIcon size={32} className="mx-auto mb-3 opacity-20" />
                                        <p>Nenhum log de auditoria encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </td>
                                        <td>
                                            <div className="font-semibold text-card-foreground">
                                                {log.profile?.nome_completo || "Sistema / Auto"}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={log.user_id || ""}>
                                                {log.profile?.email || log.user_id || "N/A"}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded border border-border">
                                                {log.table_name}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`text-[10px] font-bold px-2 py-1 flex items-center justify-center w-20 rounded-md border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex"
                                                title="Ver payload JSON"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold flex items-center gap-2">
                                <Database size={18} className="text-primary" />
                                Detalhes do Log
                                <span className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getActionColor(selectedLog.action)}`}>
                                    {selectedLog.action}
                                </span>
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="p-1 rounded-md hover:bg-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Data Registrada</p>
                                    <p className="text-sm font-mono">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Tabela Alvo</p>
                                    <p className="text-sm font-mono">{selectedLog.table_name}</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">ID do Registro</p>
                                    <p className="text-sm font-mono truncate">{selectedLog.record_id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedLog.old_data && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-destructive flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-destructive" /> Dados Anteriores (OLD)
                                        </p>
                                        <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl text-xs font-mono overflow-auto max-h-[400px]">
                                            {JSON.stringify(selectedLog.old_data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {selectedLog.new_data && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-success flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-success" /> Dados Novos (NEW)
                                        </p>
                                        <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-xl text-xs font-mono overflow-auto max-h-[400px]">
                                            {JSON.stringify(selectedLog.new_data, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
};

export default AuditoriaPage;
