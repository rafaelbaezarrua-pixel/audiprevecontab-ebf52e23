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

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = filtered.filter(r => r.status === "enviada" || r.status === "gerada").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

    return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Gestão de <span className="text-primary/90">Recálculos</span></h1>
             <FavoriteToggleButton moduleId="recalculos" />
          </div>
          <p className="subtitle-premium">Controle centralizado de atualizações de guias, encargos e redistribuições fora do prazo.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-card border border-primary/10 p-2 rounded-2xl shadow-xl shadow-primary/5">
            <input
              type="month"
              value={competencia}
              onChange={e => setCompetencia(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-primary outline-none px-4 py-2 font-ubuntu"
            />
          </div>
          <button
            onClick={() => setShowNovoForm(!showNovoForm)}
            className={`h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${showNovoForm ? "bg-muted text-muted-foreground border border-border/40 hover:bg-muted/80" : "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02] active:scale-95"}`}
          >
            {showNovoForm ? "CANCELAR OPERAÇÃO" : <><Plus size={20} /> NOVO RECÁLCULO</>}
          </button>
        </div>
      </div>

      {/* Novo Recalculo Form */}
      {showNovoForm && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-card border border-primary/20 rounded-[2.5rem] p-10 shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-4 mb-10 border-b border-border/40 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                         <Plus size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Novo Registro de Recálculo</h2>
                        <p className="text-xs text-muted-foreground font-medium">Preencha os dados da guia para controle e acompanhamento.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Módulo de Origem</label>
                            <select
                                value={newRecalculo.modulo_origem}
                                onChange={e => setNewRecalculo({ ...newRecalculo, modulo_origem: e.target.value, empresa_id: "", parcelamento_id: "" })}
                                className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
                            >
                                <option value="Fiscal">SETOR FISCAL</option>
                                <option value="Pessoal">SETOR PESSOAL</option>
                                <option value="Licenças">SETOR DE LICENÇAS</option>
                                <option value="Parcelamentos">SETOR DE PARCELAMENTOS</option>
                            </select>
                        </div>

                        {newRecalculo.modulo_origem === "Parcelamentos" ? (
                            <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cliente do Parcelamento</label>
                                <select value={newRecalculo.parcelamento_id} onChange={e => setNewRecalculo({ ...newRecalculo, parcelamento_id: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                    <option value="">SELECIONE O CLIENTE...</option>
                                    {parcelamentos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nome_pessoa_fisica}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresa Solicitante</label>
                                <select value={newRecalculo.empresa_id} onChange={e => setNewRecalculo({ ...newRecalculo, empresa_id: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                    <option value="">SELECIONE A EMPRESA...</option>
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Guia / Tributo (Descrição)</label>
                            <input value={newRecalculo.guia} onChange={e => setNewRecalculo({ ...newRecalculo, guia: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="EX: DAS MAIOR, INSS REF..." />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Forma de Envio</label>
                            <input value={newRecalculo.forma_envio} onChange={e => setNewRecalculo({ ...newRecalculo, forma_envio: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="EX: WHATSAPP, EMAIL..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Recálculo</label>
                                <input type="date" value={newRecalculo.data_recalculo} onChange={e => setNewRecalculo({ ...newRecalculo, data_recalculo: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Envio</label>
                                <input type="date" value={newRecalculo.data_envio} onChange={e => setNewRecalculo({ ...newRecalculo, data_envio: e.target.value })} className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-10 mt-10 border-t border-border/40 flex justify-end">
                    <button 
                        onClick={handleCreateRecalculo} 
                        className="h-14 px-12 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                    >
                        <Save size={18} /> SALVAR REGISTRO
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total de Guias", count: filtered.length, cls: "text-primary", bg: "bg-primary/5", icon: <Circle size={24} /> },
          { label: "Guias Concluídas", count: completedCount, cls: "text-emerald-500", bg: "bg-emerald-500/5", icon: <CheckCircle size={24} /> },
          { label: "Pendências", count: filtered.length - completedCount, cls: "text-amber-500", bg: "bg-amber-500/5", icon: <Clock size={24} /> }
        ].map(s => (
          <div key={s.label} className="group bg-card border border-border/60 rounded-[2rem] p-8 flex items-center justify-between hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{s.label}</p>
              <p className={`text-4xl font-black tracking-tight ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 group-hover:scale-110 transition-transform duration-500`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* View Switch / Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("ativas")}
          className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "ativas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
        >
          Empresas Ativas
        </button>
        <button
          onClick={() => setActiveTab("paralisadas")}
          className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "paralisadas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
        >
          Paralisadas
        </button>
        <button
          onClick={() => setActiveTab("baixadas")}
          className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "baixadas" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
        >
          Baixadas
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md group">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input 
            type="text" 
            placeholder="BUSCAR POR CLIENTE, GUIA OU MÓDULO..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full h-14 pl-14 pr-6 bg-card border border-border/60 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm group-hover:border-primary/20" 
        />
      </div>

      {/* Recalculus List Grid */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-24 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
             <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {search ? "Nenhum resultado para os termos buscados" : "Nenhum recálculo cadastrado para esta competência"}
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
            const displayExtra = isParcelamento ? r.parcelamentos?.tipo_parcelamento : regimeLabels[r.empresas?.regime_tributario];

            return (
              <div key={r.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-2xl' : 'border-border/60 hover:border-primary/20'} rounded-[2rem] transition-all duration-300 overflow-hidden`}>
                <div 
                    className={`flex flex-col lg:flex-row lg:items-center justify-between p-6 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                    onClick={() => toggleExpand(r.id, r)}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${done ? 'bg-emerald-500 text-white shadow-emerald-500/10' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                      {done ? <CheckCircle size={28} /> : <Clock size={28} />}
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-black text-sm uppercase tracking-tight text-card-foreground truncate max-w-[300px]">{displayName}</p>
                        <span className="text-[9px] font-black px-3 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-widest border border-primary/20 flex items-center gap-2">
                           {isParcelamento ? <Users size={12} /> : <Building2 size={12} />}
                           {r.modulo_origem}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                        <span className="text-primary font-black ml-1">{r.guia}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{displayDoc || "DOCUMENTO NÃO INFORMADO"}</span>
                        {displayExtra && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{displayExtra}</span>
                            </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-6 lg:mt-0">
                    <span className={`h-8 flex items-center px-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${done ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-100' : 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm shadow-amber-100'}`}>
                        {done ? "CONCLUÍDO" : "PENDENTE"}
                    </span>
                    <div className={`p-2.5 rounded-xl bg-muted/50 text-muted-foreground transition-all duration-300 ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                        <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/40 p-10 bg-muted/5 animate-in slide-in-from-top-4 duration-300">
                    <Tabs defaultValue="dados" className="w-full">
                      <TabsList className="bg-muted/50 p-1 rounded-xl h-12 mb-8">
                        <TabsTrigger value="dados" className="px-8 h-10 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all whitespace-nowrap">Dados do Recálculo</TabsTrigger>
                        <TabsTrigger value="pastas" className="px-8 h-10 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm transition-all whitespace-nowrap flex items-center gap-2">
                           <FolderOpen size={14} /> Pastas
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="dados" className="space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status da Guia</label>
                          <select
                            value={form.status || "pendente"}
                            onChange={e => updateForm(r.id, "status", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-sm"
                          >
                            <option value="pendente">🔴 PENDENTE PARA ENVIO</option>
                            <option value="gerada">🟡 GUIA GERADA / EM ANDAMENTO</option>
                            <option value="enviada">🟢 CONCLUÍDO / ENVIADO AO CLIENTE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Efetiva de Envio</label>
                          <input
                            type="date"
                            value={form.data_envio || ""}
                            onChange={e => updateForm(r.id, "data_envio", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Forma de Envio</label>
                          <input
                            value={form.forma_envio || ""}
                            onChange={e => updateForm(r.id, "forma_envio", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            placeholder="EX: EMAIL, WHATSAPP..."
                          />
                        </div>
                    </div>

                        </div>
                      </TabsContent>

                      <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-300">
                         {r.empresas ? (
                            <ModuleFolderView empresa={{ id: r.empresa_id, ...r.empresas } as any} departamentoId="geral" />
                         ) : (
                            <div className="py-20 text-center opacity-40">
                               <p className="text-[10px] font-black uppercase tracking-widest">Acesso a pastas disponível apenas para Recálculos de Empresas</p>
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
