import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    ClipboardList, Search, CheckCircle,
    Circle, Save, Building2,
    Users, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { maskCPFCNPJ } from "@/lib/utils";

type DeclaracaoAnualRow = Database['public']['Tables']['declaracoes_anuais']['Row'];
type DeclaracaoIRPFRow = Database['public']['Tables']['declaracoes_irpf']['Row'];

interface Empresa {
    id: string;
    nome_empresa: string;
    cnpj: string | null;
    regime_tributario: string | null;
    porte_empresa: string | null;
    situacao: string | null;
}

interface Socio {
    id: string;
    nome: string;
    cpf: string | null;
    empresa_id: string;
    empresa_nome?: string;
    empresa_situacao?: string | null;
    empresa_porte?: string | null;
}

interface UnifiedSocio {
    id: string;
    nome: string;
    cpf: string | null;
    vincular: { id: string, nome: string, situacao: string, porte: string }[];
    statusIrpf: string;
    isAtiva: boolean;
    isMei: boolean;
    isParalisada: boolean;
    isBaixada: boolean;
    isEntregue: boolean;
}

interface DeclaracaoAnual extends Partial<DeclaracaoAnualRow> {
    empresa_id: string;
    ano: number;
    tipo_declaracao: string;
    obrigatorio: boolean;
    enviada: boolean;
    data_envio?: string | null;
    observacoes?: string | null;
    situacao?: 'pendente' | 'em_andamento' | 'finalizada';
}

interface DeclaracaoIRPF extends Partial<DeclaracaoIRPFRow> {
    socio_id: string;
    ano: number;
    faz_pelo_escritorio: boolean;
    situacao: 'pendente' | 'em_andamento' | 'finalizada';
    transmitida: boolean;
    data_transmissao?: string | null;
    quem_transmitiu?: string | null;
    observacoes?: string | null;
}

const DeclaracoesAnuaisPage: React.FC = () => {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [socios, setSocios] = useState<Socio[]>([]);
    const [declaracoes, setDeclaracoes] = useState<Record<string, DeclaracaoAnual>>({});
    const [declaracoesIRPF, setDeclaracoesIRPF] = useState<Record<string, DeclaracaoIRPF>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [ano, setAno] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<"defis" | "ecd_ecf" | "dasn_simei" | "dirf" | "irpf">("defis");
    const [activeIrpfTab, setActiveIrpfTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregues">("ativas");
    const [expandedIrpf, setExpandedIrpf] = useState<string | null>(null);
    const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("todos");

    const prazos: Record<string, string> = {
        defis: "31/03",
        ecd_ecf: "31/07",
        dasn_simei: "31/05",
        dirf: "27/02",
        irpf: "31/05"
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: emps } = await supabase.from("empresas").select("*").order("nome_empresa");
            setEmpresas((emps as Empresa[]) || []);

            const { data: socs } = await supabase.from("socios").select("*, empresas(nome_empresa, situacao, porte_empresa)");
            setSocios(((socs || []) as any).map((s: any) => ({
                ...s,
                empresa_nome: s.empresas?.nome_empresa,
                empresa_situacao: s.empresas?.situacao,
                empresa_porte: s.empresas?.porte_empresa
            })));

            const { data: decls } = await supabase.from("declaracoes_anuais").select("*").eq("ano", ano);
            const declMap: Record<string, DeclaracaoAnual> = {};
            (decls as any[])?.forEach(d => {
                declMap[`${d.empresa_id}_${d.tipo_declaracao}`] = {
                    ...d,
                    observacoes: d.observacoes || "",
                    situacao: d.situacao || (d.enviada ? 'finalizada' : 'pendente')
                } as DeclaracaoAnual;
            });
            setDeclaracoes(declMap);

            const { data: irpfs } = await supabase.from("declaracoes_irpf").select("*").eq("ano", ano);
            const irpfMap: Record<string, DeclaracaoIRPF> = {};
            (irpfs as any[])?.forEach(i => {
                irpfMap[i.socio_id] = {
                    ...i,
                    faz_pelo_escritorio: i.faz_pelo_escritorio ?? false,
                    situacao: i.situacao || 'pendente'
                } as DeclaracaoIRPF;
            });
            setDeclaracoesIRPF(irpfMap);
            
            // 1. Buscar IDs de usuários que são da equipe interna (admin ou user)
            const { data: rolesData } = await supabase
                .from("user_roles")
                .select("user_id")
                .in("role", ["admin", "user"]);
            
            const teamUserIds = rolesData?.map(r => r.user_id) || [];

            // 2. Buscar perfis desses usuários
            const { data: profs, error: pErr } = await supabase
                .from("profiles")
                .select("*")
                .in("user_id", teamUserIds)
                .eq("ativo", true);

            if (pErr) throw pErr;
            setProfiles(profs || []);
        } catch (err: any) {
            toast.error("Erro ao carregar dados: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [ano]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleObrigatorio = (empresaId: string, tipo: string) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: false,
            enviada: false,
            data_envio: null,
            observacoes: "",
            situacao: 'pendente'
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: { ...current, obrigatorio: !current.obrigatorio }
        }));
    };

    const handleToggleEnviada = (empresaId: string, tipo: string) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: true,
            enviada: false,
            data_envio: null,
            observacoes: ""
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: {
                ...current,
                enviada: !current.enviada,
                data_envio: !current.enviada ? new Date().toISOString().split('T')[0] : null
            }
        }));
    };

    const updateDeclaracao = (empresaId: string, tipo: string, field: keyof DeclaracaoAnual, value: string | boolean | number | null) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: true,
            enviada: false,
            data_envio: null,
            observacoes: ""
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: { ...current, [field]: value }
        }));
    };

    const saveDeclaracao = async (empresaId: string, tipo: string) => {
        setSaving(true);
        const key = `${empresaId}_${tipo}`;
        const data = declaracoes[key];
        if (!data) return;

        try {
            const dbData = {
                empresa_id: data.empresa_id,
                ano: data.ano,
                tipo_declaracao: data.tipo_declaracao,
                obrigatorio: data.obrigatorio,
                enviada: data.situacao === 'finalizada',
                data_envio: data.data_envio,
                observacoes: data.observacoes,
                situacao: data.situacao || (data.enviada ? 'finalizada' : 'pendente')
            };

            if (data.id) {
                await supabase.from("declaracoes_anuais").update(dbData).eq("id", data.id);
            } else {
                const { data: inserted } = await supabase.from("declaracoes_anuais").insert(dbData).select().single();
                if (inserted) {
                    setDeclaracoes(prev => ({ 
                        ...prev, 
                        [key]: {
                            ...inserted,
                            observacoes: (inserted as any).observacoes || "",
                            situacao: (inserted as any).situacao || ((inserted as any).enviada ? 'finalizada' : 'pendente')
                        } as unknown as DeclaracaoAnual 
                    }));
                }
            }
            toast.success("Declaração salva!");
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // IRPF handlers
    const updateIRPF = (socioId: string, field: keyof DeclaracaoIRPF, value: any) => {
        const current = declaracoesIRPF[socioId] || {
            socio_id: socioId,
            ano,
            faz_pelo_escritorio: false,
            situacao: 'pendente',
            transmitida: false,
            data_transmissao: null,
            quem_transmitiu: null,
            observacoes: null
        };

        setDeclaracoesIRPF(prev => ({
            ...prev,
            [socioId]: { ...current, [field]: value }
        }));
    };

    const saveIRPF = async (socioId: string) => {
        setSaving(true);
        const data = declaracoesIRPF[socioId];
        if (!data) return;

        try {
            const dbData = {
                socio_id: data.socio_id,
                ano: data.ano,
                transmitida: data.transmitida,
                faz_pelo_escritorio: data.faz_pelo_escritorio,
                situacao: data.situacao,
                data_transmissao: data.data_transmissao,
                quem_transmitiu: data.quem_transmitiu,
                observacoes: data.observacoes
            };

            if (data.id) {
                await supabase.from("declaracoes_irpf").update(dbData).eq("id", data.id);
            } else {
                const { data: inserted } = await supabase.from("declaracoes_irpf").insert(dbData).select().single();
                if (inserted) {
                    setDeclaracoesIRPF(prev => ({ 
                        ...prev, 
                        [socioId]: {
                            ...inserted,
                            faz_pelo_escritorio: (inserted as any).faz_pelo_escritorio ?? false,
                            situacao: (inserted as any).situacao || 'pendente'
                        } as unknown as DeclaracaoIRPF 
                    }));
                }
            }
            toast.success("IRPF salvo!");
        } catch (err: any) {
            toast.error("Erro ao salvar IRPF: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filterCompanies = () => {
        return empresas.filter(e => {
            const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

            let matchTab = false;
            if (activeTab === "defis") {
                matchTab = e.regime_tributario === "simples";
            } else if (activeTab === "ecd_ecf") {
                matchTab = e.regime_tributario === "lucro_presumido" || e.regime_tributario === "lucro_real";
            } else if (activeTab === "dasn_simei") {
                matchTab = e.porte_empresa === "mei";
            } else if (activeTab === "dirf") {
                matchTab = e.porte_empresa !== "mei";
            } else {
                matchTab = true; // For IRPF we list socios
            }

            // Check for manual override (obrigatorio)
            const key = `${e.id}_${activeTab}`;
            const decl = declaracoes[key];
            if (decl?.obrigatorio) matchTab = true;
            
            // Filtro de Status
            let matchStatus = true;
            if (statusFilter !== "todos") {
                const currentStatus = decl?.situacao || (decl?.enviada ? 'finalizada' : 'pendente');
                matchStatus = currentStatus === statusFilter;
            }

            return matchSearch && matchTab && matchStatus;
        }).sort((a, b) => (a.nome_empresa || "").localeCompare(b.nome_empresa || ""));
    };

    const filterSocios = () => {
        const filtered = socios.filter(s => {
            const matchSearch = s.nome.toLowerCase().includes(search.toLowerCase()) ||
                (s.cpf && s.cpf.includes(search)) ||
                (s.empresa_nome && s.empresa_nome.toLowerCase().includes(search.toLowerCase()));
            return matchSearch;
        });

        // Agrupar por CPF (ou Nome se CPF nulo)
        const groups: Record<string, UnifiedSocio> = {};

        filtered.forEach(s => {
            const key = s.cpf || s.nome;
            const isMei = s.empresa_porte === "mei";
            const isParalisada = s.empresa_situacao === "paralisada";
            const isBaixada = s.empresa_situacao === "baixada";
            const isAtiva = !isMei && !isParalisada && !isBaixada && (s.empresa_situacao === "ativa" || !s.empresa_situacao);
            const isEntregue = s.empresa_situacao === "entregue";
            
            // Pegamos a declaração do registro "principal" do CPF
            // Para consistência, o IRPF é por PESSOA, não por Vínculo.
            const decl = declaracoesIRPF[s.id];
            const statusIrpf = decl?.situacao || 'pendente';

            if (!groups[key]) {
                groups[key] = {
                    id: s.id,
                    nome: s.nome,
                    cpf: s.cpf,
                    vincular: [],
                    statusIrpf: statusIrpf,
                    isAtiva: false,
                    isMei: false,
                    isParalisada: false,
                    isBaixada: false,
                    isEntregue: false
                };
            }
            
            groups[key].vincular.push({
                id: s.empresa_id,
                nome: s.empresa_nome || "",
                situacao: s.empresa_situacao || "",
                porte: s.empresa_porte || ""
            });

            // Se o sócio tiver pelo menos uma empresa ativando a flag, o grupo herda
            if (isAtiva) groups[key].isAtiva = true;
            if (isMei) groups[key].isMei = true;
            if (isParalisada) groups[key].isParalisada = true;
            if (isBaixada) groups[key].isBaixada = true;
            if (isEntregue) groups[key].isEntregue = true;
            
            // Priorizamos status finalizado se houver algum
            if (statusIrpf === 'finalizada') groups[key].statusIrpf = 'finalizada';
            else if (statusIrpf === 'em_andamento' && groups[key].statusIrpf === 'pendente') groups[key].statusIrpf = 'em_andamento';
        });

        return Object.values(groups).filter(p => {
            if (activeIrpfTab === "ativas") return p.isAtiva;
            if (activeIrpfTab === "mei") return p.isMei;
            if (activeIrpfTab === "paralisadas") return p.isParalisada;
            if (activeIrpfTab === "baixadas") return p.isBaixada;
            if (activeIrpfTab === "entregues") {
                return p.statusIrpf === 'finalizada';
            } else if (activeIrpfTab !== "ativas" && p.isAtiva) return false;
            
            // Filtro de Status Geral
            if (statusFilter !== "todos") {
                if (p.statusIrpf !== statusFilter) return false;
            }
            
            return true;
        }).sort((a, b) => a.nome.localeCompare(b.nome));
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    const filteredItems = activeTab === "irpf" ? filterSocios() : filterCompanies();

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="header-title">Declarações Anuais</h1>
                        <FavoriteToggleButton moduleId="declaracoes-anuais" />
                    </div>
                    <p className="subtitle-premium">Controle de DEFIS, ECD/ECF, DASN, DIRF e IRPF.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl shadow-sm">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ano Base:</span>
                        <select
                            value={ano}
                            onChange={e => setAno(parseInt(e.target.value))}
                            className="bg-transparent text-foreground text-sm focus:outline-none font-bold"
                        >
                            {[...Array(10)].map((_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                    </div>
                </div>
            </div>

            <div className="module-card">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder={activeTab === "irpf" ? "Buscar por nome, CPF ou empresa..." : "Buscar por nome ou CNPJ..."}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
                            {[
                                { id: "defis", label: "DEFIS" },
                                { id: "ecd_ecf", label: "ECD/ECF" },
                                { id: "dasn_simei", label: "DASN-SIMEI" },
                                { id: "dirf", label: "DIRF" },
                                { id: "irpf", label: "IRPF" }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/40">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Filtrar por Status:</span>
                        <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-xl border border-border">
                            {[
                                { id: "todos", label: "Todos", color: "text-muted-foreground" },
                                { id: "pendente", label: "Pendente", color: "text-amber-500" },
                                { id: "em_andamento", label: "Andamento", color: "text-info" },
                                { id: "finalizada", label: "Finalizado", color: "text-success" }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    onClick={() => setStatusFilter(st.id)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === st.id ? "bg-card shadow-sm ring-1 ring-border " + st.color : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                        
                        <div className="ml-auto">
                            {activeTab !== "irpf" && prazos[activeTab] && (
                                <div className="flex items-center gap-2 text-info bg-info/5 px-3 py-1.5 rounded-lg border border-info/20 animate-pulse">
                                    <span className="text-[10px] font-black uppercase tracking-tight">Vencimento: {prazos[activeTab]}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex bg-info/10 border border-info/20 rounded-xl p-4 mb-6 gap-3 items-start">
                    <Info size={18} className="text-info mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-info">
                        <p className="font-semibold">Obrigação para {prazos[activeTab]}</p>
                    </div>
                </div>

                {activeTab === "irpf" && (
                    <div className="flex items-center gap-2 mb-6 bg-muted/20 p-1.5 rounded-xl border border-border overflow-x-auto no-scrollbar">
                        {[
                            { id: "ativas", label: "Ativas" },
                            { id: "mei", label: "MEI" },
                            { id: "paralisadas", label: "Paralisadas" },
                            { id: "baixadas", label: "Baixadas" },
                            { id: "entregues", label: "Entregues" }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveIrpfTab(t.id as any)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeIrpfTab === t.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-3">
                    {activeTab !== "irpf" ? (
                        // Empresas List
                        (filteredItems as Empresa[]).map(emp => {
                            const isExpanded = expandedEmpresa === emp.id;
                            const key = `${emp.id}_${activeTab}`;
                            
                            // Lógica de obrigatoriedade automática
                            const isAutoObligatory =
                                (activeTab === "defis" && emp.regime_tributario === "simples") ||
                                (activeTab === "ecd_ecf" && (emp.regime_tributario === "lucro_presumido" || emp.regime_tributario === "lucro_real")) ||
                                (activeTab === "dasn_simei" && emp.porte_empresa === "mei") ||
                                (activeTab === "dirf" && emp.porte_empresa !== "mei");

                            const decl = declaracoes[key] || {
                                empresa_id: emp.id,
                                ano,
                                tipo_declaracao: activeTab,
                                obrigatorio: isAutoObligatory,
                                enviada: false,
                                data_envio: null,
                                observacoes: ""
                            };

                            return (
                                <div key={emp.id} className="module-card !p-0 overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/60">
                                    {/* Accordion Header */}
                                    <div 
                                        className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                        onClick={() => setExpandedEmpresa(isExpanded ? null : emp.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${decl.situacao === 'finalizada' ? "bg-emerald-100 text-emerald-600" : (decl.situacao === 'em_andamento' ? "bg-info/10 text-info" : "bg-warning/10 text-warning")}`}>
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-card-foreground">{emp.nome_empresa}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {emp.cnpj || "—"} • 
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${decl.obrigatorio ? "bg-info/10 text-info" : "bg-muted/50 text-muted-foreground"}`}>
                                                        {decl.obrigatorio ? "Obrigatória" : "Opcional"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                            <div className="flex items-center gap-3">
                                                {decl.situacao === 'finalizada' ? (
                                                    <span className="badge-status badge-success text-[9px]">FINALIZADO</span>
                                                ) : decl.situacao === 'em_andamento' ? (
                                                    <span className="badge-status badge-info text-[9px]">EM ANDAMENTO</span>
                                                ) : (
                                                    decl.obrigatorio && <span className="badge-status badge-warning text-[9px]">PENDENTE</span>
                                                )}
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Accordion Content */}
                                    {isExpanded && (
                                        <div className="p-6 border-t border-border bg-muted/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                {/* Obrigação Manual */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Vínculo</label>
                                                    <div className="flex items-center gap-3 bg-card px-4 py-2 border border-border rounded-xl h-[42px] shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <input
                                                                type="checkbox"
                                                                checked={decl.obrigatorio}
                                                                onChange={() => handleToggleObrigatorio(emp.id, activeTab)}
                                                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                                                            />
                                                            <span className="text-xs font-black text-foreground">Obrigatória?</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Situacao */}
                                                <div className={`space-y-2 ${!decl.obrigatorio ? "opacity-30 pointer-events-none" : ""}`}>
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Situação</label>
                                                    <select
                                                        disabled={!decl.obrigatorio}
                                                        value={decl.situacao || 'pendente'}
                                                        onChange={e => updateDeclaracao(emp.id, activeTab, "situacao", e.target.value)}
                                                        className="w-full px-4 py-2 border border-border rounded-xl bg-card text-[11px] font-black uppercase h-[42px] focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                                    >
                                                        <option value="pendente">Pendente</option>
                                                        <option value="em_andamento">Em Andamento</option>
                                                        <option value="finalizada">Finalizada</option>
                                                    </select>
                                                </div>

                                                {/* Data de Envio */}
                                                <div className={`space-y-2 ${decl.situacao !== 'finalizada' ? "opacity-30 pointer-events-none" : ""}`}>
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Data de Entrega</label>
                                                    <input
                                                        type="date"
                                                        disabled={decl.situacao !== 'finalizada'}
                                                        value={decl.data_envio || ""}
                                                        onChange={e => updateDeclaracao(emp.id, activeTab, "data_envio", e.target.value)}
                                                        className="w-full px-4 py-2 border border-border rounded-xl bg-card text-xs font-medium h-[42px] focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                                    />
                                                </div>

                                                {/* Botão Salvar */}
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            saveDeclaracao(emp.id, activeTab);
                                                        }}
                                                        disabled={saving}
                                                        className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 w-full"
                                                    >
                                                        {saving ? (
                                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <><Save size={16} /> Salvar</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Observações */}
                                            <div className={`space-y-2 ${!decl.obrigatorio ? "opacity-30 pointer-events-none" : ""}`}>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Anotações / Observações</label>
                                                <textarea
                                                    placeholder="Digite aqui informações relevantes sobre esta declaração..."
                                                    value={decl.observacoes || ""}
                                                    onChange={e => updateDeclaracao(emp.id, activeTab, "observacoes", e.target.value)}
                                                    className="w-full min-h-[100px] px-4 py-3 border border-border rounded-2xl bg-card text-sm focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm resize-y"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        // IRPF List
                        (filteredItems as UnifiedSocio[]).map(socio => {
                            const isExpanded = expandedIrpf === socio.id;
                            const decl = declaracoesIRPF[socio.id] || {
                                socio_id: socio.id,
                                ano,
                                faz_pelo_escritorio: false,
                                situacao: 'pendente',
                                transmitida: false,
                                data_transmissao: null,
                                quem_transmitiu: null,
                                observacoes: null
                            };

                            return (
                                <div key={socio.id} className="module-card !p-0 overflow-hidden shadow-sm hover:shadow-md transition-all border border-border/60">
                                    {/* Accordion Header */}
                                     <div 
                                         className="p-4 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                         onClick={() => setExpandedIrpf(isExpanded ? null : socio.id)}
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${decl.transmitida ? "bg-emerald-100 text-emerald-600" : "bg-warning/10 text-warning"}`}>
                                                 <Users size={20} />
                                             </div>
                                             <div>
                                                 <p className="font-bold text-card-foreground">{socio.nome}</p>
                                                 <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                                     Doc: {maskCPFCNPJ(socio.cpf || "")} • 
                                                     <span className="ml-1 text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full border border-border/60">
                                                        {socio.vincular.length} {socio.vincular.length === 1 ? 'Empresa' : 'Empresas'}
                                                     </span>
                                                     <span className="ml-2 opacity-70">
                                                        ({socio.vincular.map(v => v.nome).join(", ")})
                                                     </span>
                                                 </p>
                                             </div>
                                         </div>

                                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    decl.situacao === 'finalizada' ? 'bg-emerald-100 text-emerald-700' : 
                                                    decl.situacao === 'em_andamento' ? 'bg-blue-100 text-blue-700' : 
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {decl.situacao.replace('_', ' ')}
                                                </span>
                                                {decl.transmitida && <span className="badge-status badge-success text-[9px]">TRANSMITIDA</span>}
                                            </div>
                                            {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Accordion Content */}
                                    {isExpanded && (
                                        <div className="p-6 border-t border-border bg-muted/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                                {/* Feito pelo Escritório */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Escritório?</label>
                                                    <div className="flex items-center gap-3 bg-card px-4 py-2 border border-border rounded-xl h-[42px] shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={decl.faz_pelo_escritorio}
                                                                    onChange={e => updateIRPF(socio.id, "faz_pelo_escritorio", e.target.checked)}
                                                                    className="sr-only"
                                                                />
                                                                <div className={`w-9 h-5 rounded-full transition-colors ${decl.faz_pelo_escritorio ? 'bg-primary shadow-inner shadow-primary/30' : 'bg-muted-foreground/30'}`} />
                                                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${decl.faz_pelo_escritorio ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </div>
                                                            <span className="text-xs font-black text-foreground">{decl.faz_pelo_escritorio ? "Sim" : "Não"}</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Situação */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Situação</label>
                                                    <select 
                                                        value={decl.situacao} 
                                                        onChange={e => updateIRPF(socio.id, "situacao", e.target.value)} 
                                                        className="w-full px-4 py-2 border border-border rounded-xl bg-card text-xs font-black h-[42px] focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                                    >
                                                        <option value="pendente">Pendente</option>
                                                        <option value="em_andamento">Em Andamento</option>
                                                        <option value="finalizada">Finalizada</option>
                                                    </select>
                                                </div>

                                                {/* Transmitida */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Transmitida?</label>
                                                    <div className="flex items-center gap-3 bg-card px-4 py-2 border border-border rounded-xl h-[42px] shadow-sm">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={decl.transmitida}
                                                                onChange={e => updateIRPF(socio.id, "transmitida", e.target.checked)}
                                                                className="w-5 h-5 rounded border-border text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer"
                                                            />
                                                            <span className={`text-[10px] font-black uppercase tracking-wider ${decl.transmitida ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                                {decl.transmitida ? "Transmissão OK" : "Pendente"}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Data Transmissão */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Data Transmissão</label>
                                                    <input
                                                        type="date"
                                                        value={decl.data_transmissao || ""}
                                                        onChange={e => updateIRPF(socio.id, "data_transmissao", e.target.value)}
                                                        className="w-full px-4 py-2 border border-border rounded-xl bg-card text-xs font-medium h-[42px] focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                                    />
                                                </div>

                                                {/* Feito Por */}
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Feito Por (Equipe)</label>
                                                    <select
                                                        value={decl.quem_transmitiu || ""}
                                                        onChange={e => updateIRPF(socio.id, "quem_transmitiu", e.target.value)}
                                                        className="w-full px-4 py-2 border border-border rounded-xl bg-card text-xs font-black h-[42px] focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {profiles.map(p => (
                                                            <option key={p.user_id} value={p.nome_completo}>{p.nome_completo}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Observações */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-tight ml-1">Anotações / Observações</label>
                                                <textarea
                                                    placeholder="Digite aqui informações relevantes sobre a declaração deste sócio..."
                                                    value={decl.observacoes || ""}
                                                    onChange={e => updateIRPF(socio.id, "observacoes", e.target.value)}
                                                    className="w-full min-h-[120px] px-4 py-3 border border-border rounded-2xl bg-card text-sm focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm resize-y"
                                                />
                                            </div>

                                            <div className="flex justify-end pt-4 border-t border-border/50">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        saveIRPF(socio.id);
                                                    }}
                                                    disabled={saving}
                                                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <><Save size={16} /> Salvar Alterações</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {filteredItems.length === 0 && (
                        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                            <ClipboardList size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground font-medium">Nenhum registro encontrado para esta categoria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeclaracoesAnuaisPage;
