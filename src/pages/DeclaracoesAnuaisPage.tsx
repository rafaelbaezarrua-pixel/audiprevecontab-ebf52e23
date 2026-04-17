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
      <div className="space-y-6 animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="header-title">Declarações <span className="text-primary/90 font-black">Anuais</span></h1>
            <FavoriteToggleButton moduleId="declaracoes-anuais" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm">Controle de DEFIS, ECD/ECF, DASN, DIRF e IRPF.</p>
        </div>
        
        <div className="flex items-center gap-2 px-3 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl shadow-inner group">
          <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest group-hover:text-primary transition-colors">Ano Base:</span>
          <select
            value={ano}
            onChange={e => setAno(parseInt(e.target.value))}
            className="bg-transparent text-foreground text-[10px] focus:outline-none font-black uppercase tracking-tighter"
          >
            {[...Array(10)].map((_, i) => {
              const year = new Date().getFullYear() - 5 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {/* Modules Navigation & Search */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar w-full lg:w-auto shadow-inner gap-1">
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
                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full lg:max-w-md group">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" />
            <input
              type="text"
              placeholder="BUSCAR EMPRESA OU SÓCIO..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20 shadow-sm"
            />
          </div>
        </div>

        {/* Filters & Deadline Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 w-fit">
            {[
              { id: "todos", label: "Todos", color: "text-muted-foreground" },
              { id: "pendente", label: "Pendente", color: "text-rose-500" },
              { id: "em_andamento", label: "Andamento", color: "text-amber-500" },
              { id: "finalizada", label: "Finalizado", color: "text-emerald-500" }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === st.id ? "bg-card shadow-sm " + st.color : "text-muted-foreground/50 hover:text-foreground"}`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {activeTab !== "irpf" && prazos[activeTab] && (
            <div className="flex items-center gap-2 bg-info/5 px-3 py-1.5 rounded-lg border border-info/10">
              <Info size={12} className="text-info" />
              <span className="text-[9px] font-black uppercase tracking-widest text-info">Vencimento: {prazos[activeTab]}</span>
            </div>
          )}
        </div>

        {activeTab === "irpf" && (
          <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar w-full shadow-inner gap-1">
            {[
              { id: "ativas", label: "Ativas" },
              { id: "mei", label: "MEI" },
              { id: "paralisadas", label: "Paral." },
              { id: "baixadas", label: "Baix." },
              { id: "entregues", label: "Entr." }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveIrpfTab(t.id as any)}
                className={`flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeIrpfTab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {activeTab !== "irpf" ? (
          (filteredItems as Empresa[]).map(emp => {
            const isExpanded = expandedEmpresa === emp.id;
            const key = `${emp.id}_${activeTab}`;
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
                observacoes: "",
                situacao: 'pendente'
            };

            return (
              <div key={emp.id} className={`group bg-card border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-primary/40 ring-1 ring-primary/5' : 'border-border/40 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/[0.03]' : 'hover:bg-primary/[0.01]'}`} 
                  onClick={() => setExpandedEmpresa(isExpanded ? null : emp.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${decl.situacao === 'finalizada' ? "bg-emerald-500/10 text-emerald-500" : (decl.situacao === 'em_andamento' ? "bg-amber-500/10 text-amber-500" : "bg-black/5 dark:bg-white/5 text-muted-foreground/30 border border-border/10")}`}>
                      <Building2 size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-[11px] uppercase tracking-tight text-foreground truncate max-w-[280px] group-hover:text-primary transition-colors">{emp.nome_empresa}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest font-mono">{emp.cnpj || "N/D"}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${decl.obrigatorio ? "bg-primary/5 text-primary border-primary/20" : "bg-black/5 text-muted-foreground/30 border-border/10"}`}>
                          {decl.obrigatorio ? "OBRIGATÓRIA" : "OPCIONAL"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${decl.situacao === 'finalizada' ? "text-emerald-500" : (decl.situacao === 'em_andamento' ? "text-amber-500" : (decl.obrigatorio ? "text-rose-500" : "text-muted-foreground/40"))}`}>
                      {decl.situacao === 'finalizada' ? "FINALIZADO" : (decl.situacao === 'em_andamento' ? "ANDAMENTO" : (decl.obrigatorio ? "PENDENTE" : "-"))}
                    </span>
                    <div className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/30 border-border/10'}`}>
                      <ChevronDown size={12} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/5 p-4 space-y-4 bg-black/[0.01] dark:bg-white/[0.01] animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border/10 shadow-inner">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Vínculo</label>
                        <div 
                          onClick={() => handleToggleObrigatorio(emp.id, activeTab)}
                          className={`w-full h-9 px-3 rounded-lg flex items-center gap-2 cursor-pointer border transition-all ${decl.obrigatorio ? 'bg-primary/10 border-primary/20' : 'bg-card border-border/10'}`}
                        >
                          <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${decl.obrigatorio ? 'bg-primary border-primary text-white' : 'bg-white border-border/40'}`}>
                            {decl.obrigatorio && <CheckCircle size={8} />}
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${decl.obrigatorio ? 'text-primary' : 'text-muted-foreground/50'}`}>Obrigatória?</span>
                        </div>
                      </div>

                      <div className={`space-y-1 ${!decl.obrigatorio ? "opacity-20 pointer-events-none" : ""}`}>
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Situação</label>
                        <select
                          disabled={!decl.obrigatorio}
                          value={decl.situacao || 'pendente'}
                          onChange={e => updateDeclaracao(emp.id, activeTab, "situacao", e.target.value)}
                          className="w-full h-9 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                        >
                          <option value="pendente">PENDENTE</option>
                          <option value="em_andamento">ANDAMENTO</option>
                          <option value="finalizada">FINALIZADA</option>
                        </select>
                      </div>

                      <div className={`space-y-1 ${decl.situacao !== 'finalizada' ? "opacity-20 pointer-events-none" : ""}`}>
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Data Entrega</label>
                        <input
                          type="date"
                          disabled={decl.situacao !== 'finalizada'}
                          value={decl.data_envio || ""}
                          onChange={e => updateDeclaracao(emp.id, activeTab, "data_envio", e.target.value)}
                          className="w-full h-9 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 font-mono"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => saveDeclaracao(emp.id, activeTab)}
                          disabled={saving}
                          className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={14} /> SALVAR</>}
                        </button>
                      </div>
                    </div>

                    <div className={`space-y-1 ${!decl.obrigatorio ? "opacity-20 pointer-events-none" : ""}`}>
                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Anotações / Observações</label>
                      <textarea
                        placeholder="Notas importantes sobre esta declaração..."
                        value={decl.observacoes || ""}
                        onChange={e => updateDeclaracao(emp.id, activeTab, "observacoes", e.target.value)}
                        className="w-full min-h-[60px] p-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-medium outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
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
              <div key={socio.id} className={`group bg-card border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-primary/40 ring-1 ring-primary/5' : 'border-border/40 hover:border-primary/20'}`}>
                <div 
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/[0.03]' : 'hover:bg-primary/[0.01]'}`} 
                  onClick={() => setExpandedIrpf(isExpanded ? null : socio.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${decl.situacao === 'finalizada' ? "bg-emerald-500/10 text-emerald-500" : (decl.situacao === 'em_andamento' ? "bg-amber-500/10 text-amber-500" : "bg-black/5 dark:bg-white/5 text-muted-foreground/30 border border-border/10")}`}>
                      <Users size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-black text-[11px] uppercase tracking-tight text-foreground truncate max-w-[280px] group-hover:text-primary transition-colors">{socio.nome}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest font-mono">{maskCPFCNPJ(socio.cpf || "")}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span className="text-[8px] font-black text-primary/60 uppercase tracking-tighter">
                          {socio.vincular.length} {socio.vincular.length === 1 ? 'EMPRESA' : 'EMPRESAS'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${decl.situacao === 'finalizada' ? "text-emerald-500" : (decl.situacao === 'em_andamento' ? "text-amber-500" : "text-rose-500")}`}>
                      {decl.situacao === 'finalizada' ? "FINALIZADO" : (decl.situacao === 'em_andamento' ? "ANDAMENTO" : "PENDENTE")}
                    </span>
                    <div className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/30 border-border/10'}`}>
                      <ChevronDown size={12} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/5 p-4 space-y-4 bg-black/[0.01] dark:bg-white/[0.01] animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border/10 shadow-inner">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Escritório?</label>
                        <div 
                          onClick={() => updateIRPF(socio.id, "faz_pelo_escritorio", !decl.faz_pelo_escritorio)}
                          className={`w-full h-9 px-3 rounded-lg flex items-center gap-2 cursor-pointer border transition-all ${decl.faz_pelo_escritorio ? 'bg-primary/10 border-primary/20' : 'bg-card border-border/10'}`}
                        >
                          <div className={`w-6 h-3.5 rounded-full relative transition-colors ${decl.faz_pelo_escritorio ? 'bg-primary' : 'bg-muted-foreground/20'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${decl.faz_pelo_escritorio ? 'translate-x-2.5' : 'translate-x-0'}`} />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${decl.faz_pelo_escritorio ? 'text-primary' : 'text-muted-foreground/50'}`}>{decl.faz_pelo_escritorio ? "SIM" : "NÃO"}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Situação</label>
                        <select 
                          value={decl.situacao} 
                          onChange={e => updateIRPF(socio.id, "situacao", e.target.value)} 
                          className="w-full h-9 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                        >
                          <option value="pendente">PENDENTE</option>
                          <option value="em_andamento">ANDAMENTO</option>
                          <option value="finalizada">FINALIZADA</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Transmissão</label>
                        <div 
                           onClick={() => updateIRPF(socio.id, "transmitida", !decl.transmitida)}
                           className={`w-full h-9 px-3 rounded-lg flex items-center gap-2 cursor-pointer border transition-all ${decl.transmitida ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-card border-border/10'}`}
                        >
                           <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all ${decl.transmitida ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-border/40'}`}>
                            {decl.transmitida && <CheckCircle size={8} />}
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${decl.transmitida ? 'text-emerald-500' : 'text-muted-foreground/50'}`}>{decl.transmitida ? "ENVIADO" : "PENDENTE"}</span>
                        </div>
                      </div>

                      <div className={`space-y-1 ${decl.situacao !== 'finalizada' ? "opacity-20 pointer-events-none" : ""}`}>
                        <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Quem / Data</label>
                         <div className="flex gap-1 h-9">
                            <select
                                value={decl.quem_transmitiu || ""}
                                onChange={e => updateIRPF(socio.id, "quem_transmitiu", e.target.value)}
                                className="flex-1 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none px-2 focus:ring-1 focus:ring-primary/20"
                            >
                                <option value="">-</option>
                                {profiles.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                            </select>
                            <input
                                type="date"
                                value={decl.data_transmissao || ""}
                                onChange={e => updateIRPF(socio.id, "data_transmissao", e.target.value)}
                                className="w-24 bg-card border border-border/10 rounded-lg text-[9px] font-mono outline-none px-1 focus:ring-1 focus:ring-primary/20"
                            />
                            <p className="text-muted-foreground font-medium">Nenhum registro encontrado para esta categoria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeclaracoesAnuaisPage;
