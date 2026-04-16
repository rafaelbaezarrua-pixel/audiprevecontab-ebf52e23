import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, Eye, Database, List as ListIcon, X, ArrowRight, Plus, Trash2, Pencil, Shield } from "lucide-react";
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

// Tradução de nomes de campos técnicos para labels amigáveis
const fieldLabels: Record<string, string> = {
    id: "ID",
    created_at: "Data de Criação",
    updated_at: "Última Atualização",
    nome_empresa: "Nome da Empresa",
    nome_fantasia: "Nome Fantasia",
    cnpj: "CNPJ",
    data_abertura: "Data de Abertura",
    porte_empresa: "Porte",
    regime_tributario: "Regime Tributário",
    natureza_juridica: "Natureza Jurídica",
    situacao: "Situação",
    endereco: "Endereço",
    email_rfb: "E-mail RFB",
    telefone_rfb: "Telefone RFB",
    capital_social: "Capital Social",
    cnae_fiscal: "CNAE",
    cnae_fiscal_descricao: "Descrição CNAE",
    modulos_ativos: "Módulos Ativos",
    nome: "Nome",
    nome_completo: "Nome Completo",
    cpf: "CPF",
    email: "E-mail",
    administrador: "Administrador",
    percentual_cotas: "% de Cotas",
    data_entrada: "Data de Entrada",
    data_saida: "Data de Saída",
    status: "Status",
    vencimento: "Vencimento",
    tipo_licenca: "Tipo de Licença",
    numero_processo: "Nº do Processo",
    empresa_id: "Empresa (ID)",
    user_id: "Usuário (ID)",
    role: "Perfil",
    module_name: "Módulo",
    action_type: "Tipo de Ação",
    table_name: "Tabela",
    record_id: "ID do Registro",
    old_data: "Dados Anteriores",
    new_data: "Dados Novos",
    valor: "Valor",
    competencia: "Competência",
    data_emissao: "Data de Emissão",
    data_vencimento: "Data de Vencimento",
    nome_cliente: "Nome do Cliente",
    criado_por: "Criado Por",
    descricao: "Descrição",
    observacoes: "Observações",
    titulo: "Título",
    prioridade: "Prioridade",
    atribuido_para: "Atribuído Para",
    concluido: "Concluído",
    data_conclusao: "Data de Conclusão",
    tipo: "Tipo",
    departamento: "Departamento",
    foto_url: "Foto de Perfil",
    favoritos: "Favoritos",
    ativo: "Ativo",
    profile_completed: "Perfil Completo",
    terms_accepted_at: "Termos Aceitos em",
    first_access_done: "Primeiro Acesso Feito",
    email_alertas: "E-mail para Alertas",
    opcao_pelo_simples: "Opção Simples Nacional",
    opcao_pelo_mei: "Opção MEI",
    possui_funcionarios: "Possui Funcionários",
    somente_pro_labore: "Somente Pró-labore",
    possui_cartao_ponto: "Possui Cartão Ponto",
};

const tableLabels: Record<string, string> = {
    empresas: "Empresas",
    socios: "Sócios",
    licencas: "Licenças",
    certidoes: "Certidões",
    procuracoes: "Procurações",
    certificados_digitais: "Certificados Digitais",
    fiscal: "Fiscal",
    pessoal: "Pessoal",
    parcelamentos: "Parcelamentos",
    honorarios_config: "Config. Honorários",
    honorarios_mensal: "Honorários Mensal",
    ocorrencias: "Ocorrências",
    processos_societarios: "Processos Societários",
    faturamentos: "Faturamentos",
    profiles: "Perfis de Usuário",
    tarefas: "Tarefas",
    agendamentos: "Agendamentos",
    notifications: "Notificações",
    user_roles: "Papéis de Usuário",
    user_module_permissions: "Permissões de Módulo",
    empresa_acessos: "Acessos de Empresa",
    audit_logs: "Logs de Auditoria",
    recalculos: "Recálculos",
    documentos_assinaturas: "Assinaturas Digitais",
    funcionarios: "Funcionários",
    controle_irpf: "Controle IRPF",
    servicos_esporadicos: "Serviços Esporádicos",
    declaracoes_anuais: "Declarações Anuais",
    tickets: "Tickets",
    internal_messages: "Mensagens Internas",
};

const actionLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    INSERT: { label: "Criação", icon: <Plus size={14} /> },
    UPDATE: { label: "Edição", icon: <Pencil size={14} /> },
    DELETE: { label: "Exclusão", icon: <Trash2 size={14} /> },
    CONSENT_GRANTED: { label: "Aceite LGPD", icon: <Shield size={14} /> },
    SYSTEM_SEED: { label: "Carga Sistema", icon: <Database size={14} /> },
};

// Campos que devem ser ignorados na visualização (ruído técnico)
const HIDDEN_FIELDS = new Set(["id", "created_at", "updated_at", "empresa_id", "user_id", "criado_por"]);

function getFieldLabel(key: string): string {
    return fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(value: any): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (typeof value === "object") {
        if (Array.isArray(value)) return value.length === 0 ? "Nenhum" : value.join(", ");
        // For objects like endereco, show a summary
        const entries = Object.entries(value).filter(([, v]) => v);
        if (entries.length === 0) return "—";
        return entries.map(([k, v]) => `${getFieldLabel(k)}: ${v}`).join(" • ");
    }
    if (typeof value === "number") {
        // Format currency-like numbers
        if (value >= 100 && Number.isFinite(value)) {
            return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(value);
    }
    return String(value);
}

function getChangedFields(oldData: any, newData: any): { key: string; oldVal: any; newVal: any }[] {
    if (!oldData || !newData) return [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    const changes: { key: string; oldVal: any; newVal: any }[] = [];

    for (const key of allKeys) {
        if (HIDDEN_FIELDS.has(key)) continue;
        const oldVal = oldData[key];
        const newVal = newData[key];
        // Deep comparison for objects
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ key, oldVal, newVal });
        }
    }
    return changes;
}

function getVisibleFields(data: any): { key: string; value: any }[] {
    if (!data) return [];
    return Object.entries(data)
        .filter(([key]) => !HIDDEN_FIELDS.has(key))
        .map(([key, value]) => ({ key, value }));
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
        const { data: logsData, error } = await (supabase as any)
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
                    const newLog = payload.new as unknown as AuditLog;
                    (supabase as any)
                        .from("profiles")
                        .select("nome_completo, email")
                        .eq("user_id", newLog.user_id)
                        .maybeSingle()
                        .then(({ data: profile }: any) => {
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
            case 'CONSENT_GRANTED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'SYSTEM_SEED': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-muted text-muted-foreground border-border';
        }
    };

    // Gera um resumo amigável do que mudou para exibir na tabela principal
    const getSummary = (log: AuditLog): string => {
        const actionInfo = actionLabels[log.action] || { label: log.action };
        const tableName = tableLabels[log.table_name] || log.table_name;

        if (log.action === "UPDATE" && log.old_data && log.new_data) {
            const changes = getChangedFields(log.old_data, log.new_data);
            if (changes.length === 0) return `${actionInfo.label} em ${tableName}`;
            const fieldNames = changes.slice(0, 3).map(c => getFieldLabel(c.key)).join(", ");
            const extra = changes.length > 3 ? ` +${changes.length - 3}` : "";
            return `Alterou ${fieldNames}${extra}`;
        }
        if (log.action === "INSERT" && log.new_data) {
            const name = log.new_data.nome_empresa || log.new_data.nome_completo || log.new_data.nome || log.new_data.nome_cliente || log.new_data.titulo || "";
            return name ? `Criou "${name}"` : `Novo registro`;
        }
        if (log.action === "DELETE" && log.old_data) {
            const name = log.old_data.nome_empresa || log.old_data.nome_completo || log.old_data.nome || log.old_data.nome_cliente || log.old_data.titulo || "";
            return name ? `Removeu "${name}"` : `Registro removido`;
        }
        return `${actionInfo.label} em ${tableName}`;
    };

    // Renderiza o conteúdo do modal de detalhes
    const renderDetailContent = (log: AuditLog) => {
        if (log.action === "UPDATE" && log.old_data && log.new_data) {
            const changes = getChangedFields(log.old_data, log.new_data);
            if (changes.length === 0) {
                return <p className="text-sm text-muted-foreground py-4">Nenhuma alteração detectada nos campos visíveis.</p>;
            }
            return (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        {changes.length} campo{changes.length > 1 ? "s" : ""} alterado{changes.length > 1 ? "s" : ""}
                    </p>
                    <div className="space-y-2">
                        {changes.map(({ key, oldVal, newVal }) => (
                            <div key={key} className="p-3 bg-muted/30 rounded-xl border border-border hover:border-warning/30 transition-colors">
                                <p className="text-xs font-bold text-card-foreground mb-2">{getFieldLabel(key)}</p>
                                <div className="flex items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-destructive/70 block mb-0.5">Antes</span>
                                        <p className="text-sm text-destructive bg-destructive/5 px-2.5 py-1.5 rounded-lg break-words border border-destructive/10">
                                            {formatValue(oldVal)}
                                        </p>
                                    </div>
                                    <ArrowRight size={16} className="text-muted-foreground mt-5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-success/70 block mb-0.5">Depois</span>
                                        <p className="text-sm text-success bg-success/5 px-2.5 py-1.5 rounded-lg break-words border border-success/10">
                                            {formatValue(newVal)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (log.action === "INSERT" && log.new_data) {
            const fields = getVisibleFields(log.new_data);
            return (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        Dados do novo registro
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fields.map(({ key, value }) => (
                            <div key={key} className="p-3 bg-success/5 rounded-xl border border-success/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">{getFieldLabel(key)}</p>
                                <p className="text-sm text-card-foreground font-medium break-words">{formatValue(value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (log.action === "DELETE" && log.old_data) {
            const fields = getVisibleFields(log.old_data);
            return (
                <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        Dados do registro removido
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fields.map(({ key, value }) => (
                            <div key={key} className="p-3 bg-destructive/5 rounded-xl border border-destructive/10">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">{getFieldLabel(key)}</p>
                                <p className="text-sm text-card-foreground font-medium break-words line-through opacity-70">{formatValue(value)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return <p className="text-sm text-muted-foreground py-4">Sem dados para exibir.</p>;
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
        <div className="space-y-6">
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
                            <option value="INSERT">Criações</option>
                            <option value="UPDATE">Edições</option>
                            <option value="DELETE">Exclusões</option>
                        </select>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                        <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <select
                            value={filterTable}
                            onChange={e => setFilterTable(e.target.value)}
                            className="w-full pl-8 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm font-medium appearance-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                        >
                            <option value="all">Módulo: Todos</option>
                            {tables.map(t => <option key={t} value={t}>{tableLabels[t] || t}</option>)}
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
                                <th>Módulo</th>
                                <th>Ação</th>
                                <th>Resumo</th>
                                <th className="text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <ListIcon size={32} className="mx-auto mb-3 opacity-20" />
                                        <p>Nenhum log de auditoria encontrado.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                                        <td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </td>
                                        <td>
                                            <div className="font-semibold text-card-foreground text-sm">
                                                {log.profile?.nome_completo || "Sistema"}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded border border-border">
                                                {tableLabels[log.table_name] || log.table_name}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`text-[10px] font-bold px-2 py-1 flex items-center gap-1 w-fit rounded-md border ${getActionColor(log.action)}`}>
                                                {actionLabels[log.action]?.icon}
                                                {actionLabels[log.action]?.label || log.action}
                                            </span>
                                        </td>
                                        <td className="max-w-[250px]">
                                            <span className="text-xs text-muted-foreground truncate block">
                                                {getSummary(log)}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors inline-flex"
                                                title="Ver detalhes"
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
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedLog(null)}>
                    <div className="bg-card w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold flex items-center gap-2">
                                {actionLabels[selectedLog.action]?.icon}
                                <span>{actionLabels[selectedLog.action]?.label || selectedLog.action}</span>
                                <span className="text-muted-foreground font-normal">em</span>
                                <span className="text-primary">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</span>
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="p-1 rounded-md hover:bg-muted">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Data</p>
                                    <p className="text-sm font-medium">{format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Usuário</p>
                                    <p className="text-sm font-medium">{selectedLog.profile?.nome_completo || "Sistema"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Módulo</p>
                                    <p className="text-sm font-medium">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</p>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                {renderDetailContent(selectedLog)}
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

