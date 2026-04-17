
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
    <div className="space-y-6 animate-fade-in pb-10 relative px-0.5">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="header-title">Declarações <span className="text-primary/90 font-black">Mensais</span></h1>
            <FavoriteToggleButton moduleId="declaracoes-mensais" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm">Controle de Fluxo, Fechamentos e DCTF WEB.</p>
        </div>
        
        <div className="flex items-center gap-2 px-3 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl shadow-inner group">
          <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest group-hover:text-primary transition-colors">Competência:</span>
          <input
            type="month"
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
            className="bg-transparent text-foreground text-[10px] focus:outline-none font-black uppercase tracking-tighter"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Empresas", val: totalCount, color: "text-primary" },
          { label: "Nesta Página", val: paginatedData.length, color: "text-foreground/70" },
          { label: "Finalizadas", val: completedCountInPage, color: "text-emerald-500" },
          { label: "Pendentes", val: paginatedData.length - completedCountInPage, color: "text-rose-500" }
        ].map(s => (
          <div key={s.label} className="bg-card border border-border/40 p-3 rounded-xl flex flex-col gap-0.5 shadow-sm">
            <span className="text-[8px] text-muted-foreground/50 uppercase font-black tracking-widest">{s.label}</span>
            <span className={`text-xl font-black ${s.color} tracking-tight`}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full lg:max-w-md group">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" />
                  <input
                      type="text"
                      placeholder="BUSCAR EMPRESA..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 h-10 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20 shadow-sm"
                  />
              </div>
              
              <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar w-full lg:w-auto shadow-inner gap-1">
                  {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
                      <button
                          key={t}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
                          onClick={() => setActiveTab(t as any)}
                      >
                          {t === "ativas" ? "Ativas" : t === "mei" ? "MEI" : t === "paralisadas" ? "Paral." : t === "entregue" ? "Entr." : "Baix."}
                      </button>
                  ))}
              </div>
          </div>

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
      </div>

      <div className="space-y-2">
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
                  <div key={emp.id} className={`group bg-card border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-primary/40 ring-1 ring-primary/5' : 'border-border/40 hover:border-primary/20'}`}>
                      <div 
                          className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/[0.03]' : 'hover:bg-primary/[0.01]'}`} 
                          onClick={() => setExpandedEmpresa(isExpanded ? null : emp.id)}
                      >
                          <div className="flex items-center gap-4">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${currentStatus === 'finalizada' ? "bg-emerald-500/10 text-emerald-500" : (currentStatus === 'em_andamento' ? "bg-amber-500/10 text-amber-500" : "bg-black/5 dark:bg-white/5 text-muted-foreground/30 border border-border/10")}`}>
                                  <CheckCircle size={16} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                  <span className="font-black text-[11px] uppercase tracking-tight text-foreground truncate max-w-[280px] group-hover:text-primary transition-colors leading-tight">{emp.nome_empresa}</span>
                                  <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest font-mono">{emp.cnpj || "N/D"}</span>
                                      <span className="w-0.5 h-0.5 rounded-full bg-border" />
                                      <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${emp.regime_tributario === 'simples' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                          {emp.regime_tributario || "EMPRESA"}
                                      </span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${currentStatus === 'finalizada' ? "text-emerald-500" : (currentStatus === 'em_andamento' ? "text-amber-500" : "text-rose-500")}`}>
                                      {currentStatus === 'finalizada' ? "FINALIZADO" : (currentStatus === 'em_andamento' ? "ANDAMENTO" : "PENDENTE")}
                                  </span>
                                  {currentStatus === 'finalizada' && form.dctf_web_data_envio && (
                                      <span className="text-[8px] text-muted-foreground/40 font-black tracking-tighter mt-0.5">{formatDateBR(form.dctf_web_data_envio)}</span>
                                  )}
                              </div>
                              <div className={`p-1.5 rounded-lg border transition-all ${isExpanded ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/30 border-border/10'}`}>
                                  <ChevronDown size={12} />
                              </div>
                          </div>
                      </div>

                      {isExpanded && (
                          <div className="border-t border-border/5 p-4 space-y-4 bg-black/[0.01] dark:bg-white/[0.01] animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border/10 shadow-inner">
                                  <div className="space-y-1">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Fluxo do Status</label>
                                      <select
                                          value={form.situacao || (form.dctf_web_gerada ? 'finalizada' : 'pendente')}
                                          onChange={e => {
                                              const val = e.target.value;
                                              updateForm(emp.id, "situacao", val);
                                              if (val !== 'finalizada') updateForm(emp.id, "dctf_web_data_envio", "");
                                          }}
                                          className="w-full h-9 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                                      >
                                          <option value="pendente">PENDENTE</option>
                                          <option value="em_andamento">EM ANDAMENTO</option>
                                          <option value="finalizada">FINALIZADA / OK</option>
                                      </select>
                                  </div>

                                  <div className="space-y-1">
                                      <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Data Transmissão</label>
                                      <input
                                          type="date"
                                          disabled={form.situacao !== 'finalizada'}
                                          value={form.dctf_web_data_envio || ""}
                                          onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)}
                                          className="w-full h-9 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-20 transition-all font-mono"
                                      />
                                  </div>

                                  <div className="flex items-end">
                                      <button
                                          onClick={() => handleSave(emp.id)}
                                          disabled={isSaving}
                                          className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                                      >
                                          {isSaving ? (
                                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                          ) : (
                                              <><Save size={14} /> SALVAR</>
                                          )}
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-1">
                                  <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Observações da Competência</label>
                                  <textarea
                                      placeholder="Anotações para este fechamento..."
                                      value={form.observacoes || ""}
                                      onChange={e => updateForm(emp.id, "observacoes", e.target.value)}
                                      className="w-full min-h-[60px] p-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-medium outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner"
                                  />
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}

          {paginatedData.length === 0 && !loadingPaginated && (
              <div className="bg-card border border-border/10 border-dashed rounded-2xl p-10 text-center flex flex-col items-center gap-3 opacity-30">
                  <Search size={24} className="text-muted-foreground" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma empresa encontrada</p>
              </div>
          )}
      </div>

      {totalCount > pagination.pageSize && (
          <div className="flex items-center justify-between mt-6 p-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-2xl shadow-inner">
              <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">
                  Página {pagination.pageIndex + 1} de {Math.ceil(totalCount / pagination.pageSize)}
              </span>
              <div className="flex items-center gap-2">
                  <button
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                      disabled={pagination.pageIndex === 0 || loadingPaginated}
                      className="w-8 h-8 rounded-lg border border-border/10 bg-card hover:bg-primary/5 disabled:opacity-20 transition-all flex items-center justify-center shadow-sm"
                  >
                      <ChevronLeft size={16} />
                  </button>
                  <button
                      onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                      disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount || loadingPaginated}
                      className="w-8 h-8 rounded-lg border border-border/10 bg-card hover:bg-primary/5 disabled:opacity-20 transition-all flex items-center justify-center shadow-sm"
                  >
                      <ChevronRight size={16} />
                  </button>
              </div>
          </div>
      )}
    </div>
    );
};

export default DeclaracoesMensaisPage;
