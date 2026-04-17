import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle2, Circle, Calculator, BookOpen, ClipboardCheck, BarChart3, FolderOpen } from "lucide-react";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useContabil } from "@/hooks/useContabil";
import { ContabilRecord, ContabilStatus } from "@/types/contabil";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<ContabilStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  concluido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  nao_se_aplica: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
};

const statusLabels: Record<ContabilStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  nao_se_aplica: "N/A"
};

const ContabilPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const { empresas, loading: empresasLoading } = useEmpresas("contabil");
  const { contabilData, loading: contabilLoading, saveContabilRecord } = useContabil(competencia);

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeStatusTab, setActiveStatusTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [activeSubTab, setActiveSubTab] = useState<"rotinas" | "fechamentos" | "obrigacoes" | "gestao" | "pastas">("rotinas");

  const filteredEmpresas = useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
      
      let matchTab = false;
      if (activeStatusTab === "ativas") matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
      else if (activeStatusTab === "mei") matchTab = e.situacao === "mei" || ((e.situacao === "ativa" || !e.situacao) && e.porte_empresa === "mei");
      else if (activeStatusTab === "paralisadas") matchTab = e.situacao === "paralisada";
      else if (activeStatusTab === "baixadas") matchTab = e.situacao === "baixada";
      else if (activeStatusTab === "entregue") matchTab = e.situacao === "entregue";

      return matchSearch && matchTab;
    });
  }, [empresas, search, activeStatusTab]);

  const toggleExpand = (empresaId: string) => {
    if (expanded === empresaId) {
      setExpanded(null);
      return;
    }
    setExpanded(empresaId);
    const existing = contabilData[empresaId] || {};
    setEditForm(prev => ({
      ...prev,
      [empresaId]: {
        ...existing,
        indices_financeiros: existing.indices_financeiros || { liquidez_corrente: 0, endividamento: 0, rentabilidade: 0 }
      }
    }));
  };

  const handleUpdateField = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [empresaId]: {
        ...prev[empresaId],
        [field]: value
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    try {
      await saveContabilRecord({
        ...editForm[empresaId],
        empresa_id: empresaId,
        competencia
      });
      toast.success("Controle contábil atualizado com sucesso!");
      setExpanded(null);
    } catch (error) {
      toast.error("Erro ao salvar dados contábeis");
    }
  };

  if (empresasLoading || contabilLoading) {
    return (
      <div className="space-y-6 animate-fade-in relative pb-10">
        <PageHeaderSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in relative pb-10 px-0.5">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <h1 className="header-title">Gestão <span className="text-primary/90 font-black">Contábil</span></h1>
             <FavoriteToggleButton moduleId="contabil" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm">Escrituração, conciliação e balancetes corporativos.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-9 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl shadow-inner">
            <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Comp.</span>
            <input 
              type="month" 
              value={competencia} 
              onChange={(e) => setCompetencia(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[10px] font-black outline-none text-primary uppercase tracking-widest cursor-pointer font-ubuntu h-full"
            />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-[280px] group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" size={14} />
          <input 
            type="text" 
            placeholder="PROCURAR EMPRESA..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-9 pr-4 h-9 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl focus:ring-1 focus:ring-primary/20 outline-none text-[10px] font-black uppercase tracking-widest transition-all placeholder:opacity-20" 
          />
        </div>

        <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 max-w-full shadow-inner">
          {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
            <button 
              key={t} 
              onClick={() => setActiveStatusTab(t as any)} 
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeStatusTab === t ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
            >
              {t === "entregue" ? "Entregues" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="module-card !p-0 shadow-sm border-border/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b border-border/10">
                <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 min-w-[200px]">Empresa / CNPJ</th>
                <th className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Conciliação</th>
                <th className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Balancete</th>
                <th className="px-4 py-2 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Status</th>
                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 pr-6 w-10">...</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filteredEmpresas.map((empresa) => {
                const record = contabilData[empresa.id];
                const isExpanded = expanded === empresa.id;
                
                return (
                  <React.Fragment key={empresa.id}>
                    <tr 
                      className={`group cursor-pointer hover:bg-primary/[0.02] transition-all ${isExpanded ? 'bg-primary/[0.04]' : ''}`}
                      onClick={() => toggleExpand(empresa.id)}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${isExpanded ? 'bg-primary text-white border-primary shadow-md' : 'bg-black/5 dark:bg-white/5 border-border/10 group-hover:border-primary/20 group-hover:text-primary'}`}>
                            <Calculator size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-foreground text-[11px] uppercase tracking-tight truncate max-w-[280px] group-hover:text-primary transition-colors">{empresa.nome_empresa}</span>
                            <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-wider font-mono">{empresa.cnpj || "N/D"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${record?.conciliacao_patrimonial_status === 'concluido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500/40 border-rose-500/10'}`}>
                          {record?.conciliacao_patrimonial_status === 'concluido' ? 'CONCILIADA' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${record?.balanco_status === 'concluido' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/20 border-border/10'}`}>
                          {record?.balanco_status === 'concluido' ? 'CONCLUÍDO' : 'ABERTO'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center gap-1">
                           {[record?.importacao_extratos_status, record?.conciliacao_patrimonial_status, record?.are_status, record?.balanco_status].map((s, i) => (
                             <div key={i} className={`w-1 h-1 rounded-full ${s === 'concluido' ? 'bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.5)]' : 'bg-black/10 dark:bg-white/10'}`} />
                           ))}
                        </div>
                      </td>
                      <td className="px-4 py-2 pr-6 text-right">
                        <div className={`p-1 rounded-lg transition-all ${isExpanded ? 'rotate-180 bg-primary/10 text-primary' : 'text-muted-foreground/20'}`}>
                          <ChevronDown size={14} />
                        </div>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-black/[0.02] dark:bg-white/[0.01]">
                        <td colSpan={5} className="px-4 py-4 pb-6 border-y border-border/10">
                        <div className="max-w-6xl">
                          <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="w-full space-y-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/10 pb-3">
                              <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner overflow-x-auto no-scrollbar">
                                <TabsTrigger value="rotinas" className="px-3 h-7 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <ClipboardCheck size={10} /> Rotinas
                                </TabsTrigger>
                                <TabsTrigger value="fechamentos" className="px-3 h-7 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <BookOpen size={10} /> Fechamentos
                                </TabsTrigger>
                                <TabsTrigger value="obrigacoes" className="px-3 h-7 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <Calculator size={10} /> Obrigações
                                </TabsTrigger>
                                <TabsTrigger value="gestao" className="px-3 h-7 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <BarChart3 size={10} /> Gestão
                                </TabsTrigger>
                                <TabsTrigger value="pastas" className="px-3 h-7 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <FolderOpen size={10} /> Arquivos
                                </TabsTrigger>
                              </TabsList>

                              <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 opacity-60">
                                 <span className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                 Controle Técnico
                              </h3>
                            </div>

                            <TabsContent value="rotinas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-200 outline-none">
                              {[
                                { id: 'importacao_extratos_status', label: 'Importação Extratos' },
                                { id: 'conciliacao_patrimonial_status', label: 'Conciliação Patrimonial' },
                                { id: 'lancamento_despesas_status', label: 'Lançamento Despesas' },
                                { id: 'controle_imobilizado_status', label: 'Controle Imobilizado' },
                                { id: 'apropriacao_despesas_status', label: 'Apropriação Despesas' },
                                { id: 'integracao_folha_fiscal_status', label: 'Integração Folha/Fiscal' },
                              ].map(field => (
                                <div key={field.id} className="p-3 bg-card border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-sm">
                                  <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{field.label}</span>
                                  <select 
                                    className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="fechamentos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-200 outline-none">
                              {[
                                { id: 'are_status', label: 'Resultado (ARE)' },
                                { id: 'balancete_status', label: 'Balancete Verificação' },
                                { id: 'balanco_status', label: 'Balanço Patrimonial' },
                                { id: 'dre_status', label: 'DRE' },
                                { id: 'dmpl_dlpa_status', label: 'DMPL / DLPA' },
                                { id: 'dfc_status', label: 'DFC' },
                                { id: 'notas_explicativas_status', label: 'Notas Explicativas' },
                              ].map(field => (
                                <div key={field.id} className="p-3 bg-card border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-sm">
                                  <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{field.label}</span>
                                  <select 
                                    className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="obrigacoes" className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-1 duration-200 outline-none">
                              {[
                                { id: 'ecd_status', label: 'ECD (DIGITAL)' },
                                { id: 'ecf_status', label: 'ECF (FISCAL)' },
                                { id: 'ibge_status', label: 'PESQUISA IBGE' },
                              ].map(field => (
                                <div key={field.id} className="p-3 bg-card border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-sm">
                                  <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">{field.label}</span>
                                  <select 
                                    className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label.toUpperCase()}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="gestao" className="space-y-3 animate-in fade-in duration-200 outline-none">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="p-4 bg-card border border-border/10 rounded-2xl relative shadow-sm">
                                    <div className="flex items-center gap-2 border-b border-border/5 pb-2 mb-3">
                                       <BarChart3 size={12} className="text-primary" />
                                       <span className="text-[8px] font-black uppercase text-foreground tracking-widest">Análise de Índices</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Liquidez Corrente</label>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          className="w-full h-8 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                          value={editForm[empresa.id]?.indices_financeiros?.liquidez_corrente || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, liquidez_corrente: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Endividamento</label>
                                        <input 
                                          type="number" 
                                          step="0.01" 
                                          className="w-full h-8 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                          value={editForm[empresa.id]?.indices_financeiros?.endividamento || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, endividamento: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-4 bg-card border border-border/10 rounded-2xl flex flex-col justify-between shadow-sm">
                                    <div className="space-y-2">
                                      <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest block pl-1">Distribuição Lucros</span>
                                      <select 
                                        className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                        value={editForm[empresa.id]?.distribuicao_lucros_status || "pendente"}
                                        onChange={(e) => handleUpdateField(empresa.id, 'distribuicao_lucros_status', e.target.value)}
                                      >
                                        {Object.entries(statusLabels).map(([val, label]) => (
                                          <option key={val} value={val}>{label.toUpperCase()}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <p className="text-[7px] text-muted-foreground/30 font-bold mt-3 uppercase tracking-widest">Dividendos e JCP</p>
                                  </div>

                                  <div className="p-4 bg-card border border-border/10 rounded-2xl flex flex-col justify-between shadow-sm">
                                    <div className="space-y-2">
                                      <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest block pl-1">Emissão DECORE</span>
                                      <select 
                                        className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                        value={editForm[empresa.id]?.decore_status || "pendente"}
                                        onChange={(e) => handleUpdateField(empresa.id, 'decore_status', e.target.value)}
                                      >
                                        {Object.entries(statusLabels).map(([val, label]) => (
                                          <option key={val} value={val}>{label.toUpperCase()}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <p className="text-[7px] text-muted-foreground/30 font-bold mt-3 uppercase tracking-widest">Rendimentos Sócios</p>
                                  </div>
                               </div>
                            </TabsContent>

                            <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none">
                               <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden">
                                 <ModuleFolderView empresa={empresa} departamentoId="contabil" />
                               </div>
                            </TabsContent>

                            <div className="mt-6 flex justify-end gap-2 border-t border-border/5 pt-4">
                              <button 
                                onClick={() => setExpanded(null)}
                                className="h-9 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-colors"
                              >
                                FECHAR
                              </button>
                              <button 
                                onClick={() => handleSave(empresa.id)}
                                className="h-9 px-8 bg-primary text-primary-foreground rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
                              >
                                <Save size={12} /> GRAVAR DADOS
                              </button>
                            </div>
                          </Tabs>
                        </div>
                      </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredEmpresas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-black/[0.02] dark:bg-white/[0.01]">
              <Search size={24} className="text-muted-foreground/10 mb-2" />
              <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">Nenhuma empresa encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContabilPage;
