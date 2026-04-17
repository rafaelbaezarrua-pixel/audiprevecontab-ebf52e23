import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Search, Plus, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Users, Building2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { RecalculoRecord, ParcelamentoRecord, GuiaStatus } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen } from "lucide-react";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const RecalculosPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("recalculos");
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRecord[]>([]);
  const [recalculos, setRecalculos] = useState<RecalculoRecord[]>([]);

  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, Partial<RecalculoRecord>>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas">("ativas");

  // Inline Form State
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [newRecalculo, setNewRecalculo] = useState({
    empresa_id: "",
    parcelamento_id: "",
    modulo_origem: "Fiscal",
    guia: "",
    data_recalculo: "",
    data_envio: "",
    forma_envio: "",
  });

  const loadData = async () => {
    // Load Parcelamentos (Clients)
    const { data: parcs } = await supabase.from("parcelamentos").select("*").order("nome_pessoa_fisica");
    setParcelamentos(parcs || []);

    // Load Recalculos
    const { data: recs } = await supabase
      .from("recalculos")
      .select(`
        *, 
        empresas(nome_empresa, cnpj, regime_tributario, situacao),
        parcelamentos(nome_pessoa_fisica, cpf_pessoa_fisica, tipo_parcelamento)
      `)
      .eq("competencia", competencia)
      .order("created_at", { ascending: false });
    setRecalculos((recs as unknown as RecalculoRecord[]) || []);
  };

  useEffect(() => {
    loadData();
  }, [competencia]);

  const filtered = recalculos.filter(r => {
    const nomeEmpresa = r.empresas?.nome_empresa || "";
    const nomePessoa = r.parcelamentos?.nome_pessoa_fisica || "";
    const termoBusca = search.toLowerCase();

    const matchSearch = nomeEmpresa.toLowerCase().includes(termoBusca) ||
      nomePessoa.toLowerCase().includes(termoBusca) ||
      r.guia?.toLowerCase().includes(termoBusca) ||
      r.modulo_origem?.toLowerCase().includes(termoBusca);

    let matchTab = false;
    // Se for parcelamento, mostra em "Ativas" por padrão, já que não tem a "situação" da empresa diretamente atrelada ao PF
    const situacao = r.empresas?.situacao;
    if (activeTab === "ativas") {
      matchTab = !situacao || situacao === "ativa";
    } else if (activeTab === "paralisadas") {
      matchTab = situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = situacao === "baixada";
    }

    return matchSearch && matchTab;
  });

  const toggleExpand = (id: string, recalculo: any) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setEditForm({
      ...editForm,
      [id]: {
        status: recalculo.status || "pendente",
        data_envio: recalculo.data_envio || "",
        forma_envio: recalculo.forma_envio || "",
      }
    });
  };

  const handleSaveUpdate = async (id: string) => {
    const form = editForm[id];
    try {
      const { error } = await supabase.from("recalculos").update({
        status: form.status,
        data_envio: form.data_envio || null,
        forma_envio: form.forma_envio || null,
      }).eq("id", id);

      if (error) throw error;
      toast.success("Recálculo atualizado com sucesso!");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateForm = (id: string, field: string, value: string | GuiaStatus | null) => {
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleCreateRecalculo = async () => {
    try {
      const isParcelamento = newRecalculo.modulo_origem === "Parcelamentos";

      if (isParcelamento && !newRecalculo.parcelamento_id) {
        toast.error("Selecione o Cliente do Parcelamento");
        return;
      }
      if (!isParcelamento && !newRecalculo.empresa_id) {
        toast.error("Selecione a Empresa");
        return;
      }
      if (!newRecalculo.guia) {
        toast.error("Preencha a descrição da Guia");
        return;
      }

      const payload = {
        empresa_id: isParcelamento ? null : newRecalculo.empresa_id,
        parcelamento_id: isParcelamento ? newRecalculo.parcelamento_id : null,
        modulo_origem: newRecalculo.modulo_origem,
        guia: newRecalculo.guia,
        competencia,
        data_recalculo: newRecalculo.data_recalculo || null,
        data_envio: newRecalculo.data_envio || null,
        forma_envio: newRecalculo.forma_envio || null,
        status: "pendente" as GuiaStatus
      };

      const { error } = await supabase.from("recalculos").insert(payload);
      if (error) throw error;

      toast.success("Recálculo cadastrado com sucesso!");
      setShowNovoForm(false);
      setNewRecalculo({ empresa_id: "", parcelamento_id: "", modulo_origem: "Fiscal", guia: "", data_recalculo: "", data_envio: "", forma_envio: "" });
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar recálculo: " + err.message);
    }
  };

  const completedCount = filtered.filter(r => r.status === "enviada" || r.status === "gerada").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

   return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="header-title">Gestão de <span className="text-primary/90 font-black">Recálculos</span></h1>
            <FavoriteToggleButton moduleId="recalculos" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm">Controle centralizado de atualizações e encargos fora do prazo.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 border border-border/10 p-1 rounded-xl shadow-inner h-10">
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-primary outline-none px-3"
            />
          </div>
          <button
            onClick={() => setShowNovoForm(!showNovoForm)}
            className={`h-10 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${showNovoForm ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-95"}`}
          >
            {showNovoForm ? "CANCELAR" : <><Plus size={14} /> NOVO REGISTRO</>}
          </button>
        </div>
      </div>

      {showNovoForm && (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-top-2">
          <div className="module-card !p-4 border-primary/20">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/10">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Plus size={16} />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-widest">Inclusão de Recálculo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Origem</label>
                <select
                  value={newRecalculo.modulo_origem}
                  onChange={e => setNewRecalculo({ ...newRecalculo, modulo_origem: e.target.value, empresa_id: "", parcelamento_id: "" })}
                  className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  <option value="Fiscal">DEP. FISCAL</option>
                  <option value="Pessoal">DEP. PESSOAL</option>
                  <option value="Licenças">TAXAS LICENÇAS</option>
                  <option value="Parcelamentos">PARCELAMENTOS</option>
                </select>
              </div>

              {newRecalculo.modulo_origem === "Parcelamentos" ? (
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Cliente (PF)</label>
                  <select value={newRecalculo.parcelamento_id} onChange={e => setNewRecalculo({ ...newRecalculo, parcelamento_id: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="">SELECIONE O CLIENTE...</option>
                    {parcelamentos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome_pessoa_fisica}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1 col-span-1 md:col-span-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Empresa</label>
                  <select value={newRecalculo.empresa_id} onChange={e => setNewRecalculo({ ...newRecalculo, empresa_id: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="">SELECIONE A EMPRESA...</option>
                    {empresas.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Descrição</label>
                <input value={newRecalculo.guia} onChange={e => setNewRecalculo({ ...newRecalculo, guia: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all uppercase" placeholder="TIPO DE GUIA / DATA" />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Forma Envio</label>
                <input value={newRecalculo.forma_envio} onChange={e => setNewRecalculo({ ...newRecalculo, forma_envio: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all uppercase" placeholder="EMAIL, WHATSAPP..." />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Data Recálculo</label>
                <input type="date" value={newRecalculo.data_recalculo} onChange={e => setNewRecalculo({ ...newRecalculo, data_recalculo: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Data Envio</label>
                <input type="date" value={newRecalculo.data_envio} onChange={e => setNewRecalculo({ ...newRecalculo, data_envio: e.target.value })} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all" />
              </div>

              <div className="md:col-span-1 flex items-end">
                <button
                  onClick={handleCreateRecalculo}
                  className="w-full h-9 bg-primary text-primary-foreground rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Save size={12} /> CONFIRMAR REGISTRO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Total de Guias", count: filtered.length, cls: "text-primary", bg: "bg-primary/5", icon: <Circle size={14} /> },
          { label: "Concluídas", count: completedCount, cls: "text-emerald-500", bg: "bg-emerald-500/5", icon: <CheckCircle size={14} /> },
          { label: "Pendências", count: filtered.length - completedCount, cls: "text-amber-500", bg: "bg-amber-500/5", icon: <Clock size={14} /> }
        ].map(s => (
          <div key={s.label} className="module-card !p-3 flex items-center justify-between shadow-sm">
            <div className="space-y-0.5">
              <p className="text-[8px] text-muted-foreground/50 uppercase font-black tracking-widest leading-tight">{s.label}</p>
              <p className={`text-xl font-black tracking-tight ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-1">
        <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar max-w-fit shadow-inner">
          {["ativas", "paralisadas", "baixadas"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
            >
              {tab === "ativas" ? "Ativas" : tab === "paralisadas" ? "Paralisadas" : "Baixadas"}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80 group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" />
          <input
            type="text"
            placeholder="BUSCAR CLIENTE, GUIA OU MÓDULO..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center bg-black/5 dark:bg-white/5 border border-dashed border-border/10 rounded-2xl opacity-40">
            <Building2 size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {search ? "Nenhum resultado" : "Nenhum recálculo pendente"}
            </p>
          </div>
        ) : (
          filtered.map(r => {
            const isOpen = expanded === r.id;
            const form = editForm[r.id] || {};
            const done = r.status === "enviada" || r.status === "gerada";
            const isParcelamento = r.modulo_origem === "Parcelamentos";
            const displayName = isParcelamento ? r.parcelamentos?.nome_pessoa_fisica : r.empresas?.nome_empresa;
            const displayDoc = isParcelamento ? r.parcelamentos?.cpf_pessoa_fisica : r.empresas?.cnpj;

            return (
              <div key={r.id} className={`bg-card border ${isOpen ? 'border-primary/40 shadow-md ring-1 ring-primary/10' : 'border-border/10 hover:border-primary/20'} rounded-xl transition-all overflow-hidden`}>
                <div
                  className={`flex flex-col lg:flex-row lg:items-center justify-between p-2.5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/[0.03]' : 'hover:bg-black/[0.02]'}`}
                  onClick={() => toggleExpand(r.id, r)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-inner shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-black/5 dark:bg-white/5 text-primary/40 group-hover:text-primary'}`}>
                      {done ? <CheckCircle size={18} /> : <Clock size={16} />}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-[11px] uppercase tracking-tight text-foreground truncate">{displayName}</p>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                          {isParcelamento ? <Users size={9} /> : <Building2 size={9} />}
                          {r.modulo_origem.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest flex items-center gap-2 truncate">
                        <span className="text-primary/70">{r.guia}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-border" />
                        <span>{displayDoc || "S/ DOC"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-2 lg:mt-0 justify-between lg:justify-end">
                    <span className={`h-5 flex items-center px-2 rounded-lg text-[8px] font-black uppercase tracking-widest border ${done ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                      {done ? "CONCLUÍDO" : "EM ABERTO"}
                    </span>
                    <div className={`p-1 rounded-lg bg-black/5 text-muted-foreground/30 transition-all duration-300 ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/10 p-4 bg-muted/10 animate-in slide-in-from-top-1 duration-200">
                    <Tabs defaultValue="dados" className="w-full">
                      <TabsList className="bg-black/10 dark:bg-white/5 p-1 rounded-lg h-9 mb-4 max-w-fit">
                        <TabsTrigger value="dados" className="px-4 h-7 text-[8px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all">Dados da Guia</TabsTrigger>
                        <TabsTrigger value="pastas" className="px-4 h-7 text-[8px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all flex items-center gap-1.5">
                          <FolderOpen size={10} /> Arquivos
                        </TabsTrigger>
                      </TabsList>
 
                      <TabsContent value="dados" className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Status Efetivo</label>
                            <select
                              value={form.status || "pendente"}
                              onChange={e => updateForm(r.id, "status", e.target.value)}
                              className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                            >
                              <option value="pendente">PENDENTE</option>
                              <option value="gerada">GUIA GERADA</option>
                              <option value="enviada">ENVIADO AO CLIENTE</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Data Efetiva Envio</label>
                            <input
                              type="date"
                              value={form.data_envio || ""}
                              onChange={e => updateForm(r.id, "data_envio", e.target.value)}
                              className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Modalidade Envio</label>
                            <input
                              value={form.forma_envio || ""}
                              onChange={e => updateForm(r.id, "forma_envio", e.target.value)}
                              className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm"
                              placeholder="EMAIL, WA..."
                            />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => handleSaveUpdate(r.id)} className="w-full md:w-auto h-9 px-6 bg-primary text-primary-foreground rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/10 group active:scale-[0.98]">
                              <Save size={12} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Salvar</span>
                            </button>
                          </div>
                        </div>
                      </TabsContent>
 
                      <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200">
                        {r.empresas ? (
                          <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden">
                             <ModuleFolderView empresa={{ id: r.empresa_id, ...r.empresas } as any} departamentoId="geral" />
                          </div>
                        ) : (
                          <div className="py-8 text-center opacity-30">
                            <p className="text-[8px] font-black uppercase tracking-widest">Gestão de arquivos desabilitada para pessoa física</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            );
          })
        )}
       </div>
    </div>
  );
};

export default RecalculosPage;
