
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Save, CheckCircle, Circle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSocietario } from "@/hooks/useSocietario";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const DeclaracoesMensaisPage: React.FC = () => {
    const { user } = useAuth();
    const { getPaginatedEmpresas } = useSocietario();
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 });
    const [paginatedData, setPaginatedData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingPaginated, setLoadingPaginated] = useState(false);

    const [pessoalData, setPessoalData] = useState<Record<string, any>>({});
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
    const [statusFilter, setStatusFilter] = useState<string>("todos");
    const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [search, activeTab]);

    useEffect(() => {
        const fetch = async () => {
            setLoadingPaginated(true);
            try {
                const { data, count } = await getPaginatedEmpresas(
                    pagination.pageIndex,
                    pagination.pageSize,
                    search,
                    activeTab,
                    "todos",
                    "declaracoes_mensais",
                    user?.id
                );
                setPaginatedData(data);
                setTotalCount(count);
            } catch (err) {
                console.error("Erro ao carregar empresas paginadas:", err);
            } finally {
                setLoadingPaginated(false);
            }
        };
        fetch();
    }, [pagination, search, activeTab, user]);

    useEffect(() => {
        const load = async () => {
            if (paginatedData.length === 0) {
                setPessoalData({});
                setEditForm({});
                return;
            }
            const empresaIds = paginatedData.map(e => e.id);
            const { data } = await supabase.from("pessoal").select("*")
                .eq("competencia", competencia)
                .in("empresa_id", empresaIds);
            const map: Record<string, any> = {};
            const formMap: Record<string, any> = {};

            data?.forEach(p => {
                map[p.empresa_id] = p;
                formMap[p.empresa_id] = {
                    dctf_web_gerada: p.dctf_web_gerada || false,
                    dctf_web_data_envio: (p as any).dctf_web_data_envio || "",
                    observacoes: (p as any).observacoes || "",
                    situacao: (p as any).situacao || (p.dctf_web_gerada ? 'finalizada' : 'pendente')
                };
            });

            // For businesses not in "pessoal" yet
            empresaIds.forEach(id => {
                if (!formMap[id]) {
                    formMap[id] = { dctf_web_gerada: false, dctf_web_data_envio: "", observacoes: "", situacao: 'pendente' };
                }
            });

            setPessoalData(map);
            setEditForm(formMap);
        };
        load();
    }, [competencia, paginatedData]);

    const updateForm = (empresaId: string, field: string, value: any) => {
        setEditForm(prev => ({
            ...prev,
            [empresaId]: {
                ...prev[empresaId],
                [field]: value
            }
        }));
    };

    const handleSave = async (empresaId: string) => {
        const form = editForm[empresaId] || {};
        const existing = pessoalData[empresaId];
        setIsSaving(true);

        try {
            const payload = {
                empresa_id: empresaId,
                competencia,
                dctf_web_gerada: form.situacao === 'finalizada',
                dctf_web_data_envio: form.dctf_web_data_envio || null,
                observacoes: form.observacoes || null,
                situacao: form.situacao || (form.dctf_web_gerada ? 'finalizada' : 'pendente')
            };

            if (existing?.id) {
                await supabase.from("pessoal").update({
                    dctf_web_gerada: payload.dctf_web_gerada,
                    dctf_web_data_envio: payload.dctf_web_data_envio,
                    observacoes: payload.observacoes,
                    situacao: payload.situacao
                }).eq("id", existing.id);
            } else {
                await supabase.from("pessoal").insert(payload);
            }

            toast.success("Dados salvos com sucesso!");

            const { data } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", competencia).maybeSingle();
            if (data) {
                setPessoalData(prev => ({ ...prev, [empresaId]: data }));
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
    const completedCountInPage = paginatedData.filter(e => editForm[e.id]?.dctf_web_gerada).length;

    if (loadingPaginated && paginatedData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Declarações Mensais</h1>
            <FavoriteToggleButton moduleId="declaracoes-mensais" />
          </div>
          <p className="subtitle-premium">Departamento Pessoal • Controle de Fluxo e DCTF WEB.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Competência:</span>
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className="bg-transparent text-foreground text-sm focus:outline-none font-bold"
            />
          </div>
        </div>
      </div>

            <div className="flex bg-info/10 border border-info/20 rounded-xl p-4 gap-3 items-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={18} className="text-info" />
                </div>
                <div className="text-sm text-info">
                    <p className="font-bold">Acompanhamento da DCTF WEB ({competencia})</p>
                    <p className="text-xs opacity-80">Gerencie a transmissão dos fechamentos da folha de pagamento e encargos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Categoria</p>
                    <p className="text-2xl font-black text-primary mt-1">{totalCount}</p>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Na Página</p>
                    <p className="text-2xl font-black text-card-foreground mt-1">{paginatedData.length}</p>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Finalizadas</p>
                    <p className="text-2xl font-black text-emerald-500 mt-1">{completedCountInPage}</p>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Pendentes</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">{paginatedData.length - completedCountInPage}</p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar empresa por nome ou CNPJ..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-border rounded-2xl bg-card text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm font-medium"
                        />
                    </div>
                    
                    <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full sm:w-auto">
                        {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
                            <button
                                key={t}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === t ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
                                onClick={() => setActiveTab(t as any)}
                            >
                                {t === "ativas" ? "Ativas" : t === "mei" ? "MEI" : t === "paralisadas" ? "Paralisadas" : t === "entregue" ? "Entregues" : "Baixadas"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Filtrar Status:</span>
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
                </div>
            </div>

            <div className="space-y-4">
                {paginatedData.filter(emp => {
                    if (statusFilter === "todos") return true;
                    const form = editForm[emp.id];
                    const currentStatus = form?.situacao || (form?.dctf_web_gerada ? 'finalizada' : 'pendente');
                    return currentStatus === statusFilter;
                }).map((emp) => {
                    const form = editForm[emp.id] || { dctf_web_gerada: false, dctf_web_data_envio: "", observacoes: "", situacao: 'pendente' };
                    const currentStatus = form.situacao || (form.dctf_web_gerada ? 'finalizada' : 'pendente');
                    const isExpanded = expandedEmpresa === emp.id;

                    return (
                        <div key={emp.id} className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* Accordion Header */}
                            <div 
                                className="p-5 cursor-pointer hover:bg-muted/20 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4"
                                onClick={() => setExpandedEmpresa(isExpanded ? null : emp.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentStatus === 'finalizada' ? "bg-emerald-100 text-emerald-600 rotate-12" : (currentStatus === 'em_andamento' ? "bg-info/10 text-info" : "bg-muted text-muted-foreground group-hover:rotate-6")}`}>
                                        <CheckCircle size={24} />
                                    </div>
                                    <div>
                                        <p className="font-black text-foreground text-sm uppercase tracking-tight">{emp.nome_empresa}</p>
                                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                                            {emp.cnpj || "—"} • 
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${emp.regime_tributario === 'simples' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {emp.regime_tributario?.replace('_', ' ') || "Empresa"}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${currentStatus === 'finalizada' ? "text-emerald-500" : (currentStatus === 'em_andamento' ? "text-info" : "text-amber-500")}`}>
                                            {currentStatus === 'finalizada' ? "Finalizado" : (currentStatus === 'em_andamento' ? "Andamento" : "Pendente")}
                                        </span>
                                        {currentStatus === 'finalizada' && form.dctf_web_data_envio && (
                                            <span className="text-[10px] text-muted-foreground font-bold mt-0.5">Enviada em {new Date(form.dctf_web_data_envio + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                        )}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>
                            </div>

                            {/* Accordion Content */}
                            {isExpanded && (
                                <div className="p-6 border-t border-border/50 bg-muted/5 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                        {/* Situação Status */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] ml-1">Situação / Status</label>
                                            <select
                                                value={form.situacao || (form.dctf_web_gerada ? 'finalizada' : 'pendente')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    updateForm(emp.id, "situacao", val);
                                                    if (val !== 'finalizada') updateForm(emp.id, "dctf_web_data_envio", "");
                                                }}
                                                className="w-full px-4 h-[44px] border border-border rounded-xl bg-card text-[13px] font-black focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm uppercase tracking-tighter"
                                            >
                                                <option value="pendente">Pendente</option>
                                                <option value="em_andamento">Em Andamento</option>
                                                <option value="finalizada">Finalizada / OK</option>
                                            </select>
                                        </div>

                                        {/* Data de Envio */}
                                        <div className={`space-y-2 ${form.situacao !== 'finalizada' ? "opacity-30 pointer-events-none" : ""}`}>
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] ml-1">Data de Transmissão</label>
                                            <input
                                                type="date"
                                                disabled={form.situacao !== 'finalizada'}
                                                value={form.dctf_web_data_envio || ""}
                                                onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)}
                                                className="w-full px-4 h-[44px] border border-border rounded-xl bg-card text-[13px] font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
                                            />
                                        </div>

                                        {/* Botão Salvar */}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleSave(emp.id)}
                                                disabled={isSaving}
                                                className="w-full h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
                                            >
                                                {isSaving ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><Save size={16} /> Salvar Alterações</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Observações */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] ml-1">Anotações da Competência</label>
                                        <textarea
                                            placeholder="Digite aqui observações relevantes para este fechamento mensal..."
                                            value={form.observacoes || ""}
                                            onChange={e => updateForm(emp.id, "observacoes", e.target.value)}
                                            className="w-full min-h-[120px] px-4 py-3 border border-border rounded-2xl bg-card text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm transition-all resize-y"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {paginatedData.length === 0 && !loadingPaginated && (
                    <div className="bg-card border border-border border-dashed rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-muted-foreground font-black text-sm uppercase tracking-widest">Nenhuma empresa encontrada</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Experimente mudar o filtro de busca ou a categoria.</p>
                    </div>
                )}
            </div>

            {totalCount > pagination.pageSize && (
                <div className="flex items-center justify-between mt-8 p-6 bg-card border border-border/60 rounded-3xl shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Página {pagination.pageIndex + 1} de {Math.ceil(totalCount / pagination.pageSize)}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                            disabled={pagination.pageIndex === 0 || loadingPaginated}
                            className="w-10 h-10 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount || loadingPaginated}
                            className="w-10 h-10 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeclaracoesMensaisPage;
