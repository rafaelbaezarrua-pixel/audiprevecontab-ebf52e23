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
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative pb-20 px-1">
      {/* Main Page Header */}
      <div className="glass-header sticky top-0 z-10 -mx-4 -mt-4 px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
            <Calculator size={28} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase italic px-0">
              Gestão <span className="text-primary/90">Contábil</span>
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase italic">
              Escrituração • Conciliação • Balancetes
            </p>
          </div>
          <div className="ml-2">
            <FavoriteToggleButton moduleId="contabil" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 px-5 h-12 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] leading-none mb-0.5">Competência</span>
            <input 
              type="month" 
              value={competencia} 
              onChange={(e) => setCompetencia(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[11px] font-black outline-none text-right h-full text-foreground uppercase tracking-widest cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-1">
        <div className="relative flex-1 w-full md:max-w-[400px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR EMPRESA OU CNPJ..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="w-full pl-11 pr-4 h-14 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl focus:ring-1 focus:ring-primary/20 outline-none text-[11px] font-black uppercase tracking-[0.15em] transition-all placeholder:text-muted-foreground/20" 
          />
        </div>

        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar gap-1 max-w-full">
          {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
            <button 
              key={t} 
              onClick={() => setActiveStatusTab(t as any)} 
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeStatusTab === t ? "bg-card text-primary shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-card/20"}`}
            >
              {t === "entregue" ? "Entregues" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="glass-card !p-0 overflow-hidden border-border/10">
        <div className="overflow-x-auto">
          <table className="data-table w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/10">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 min-w-[200px]">Empresa / CNPJ</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Conciliação</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Status Balanço</th>
                <th className="px-6 py-5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Progresso Geral</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pr-8">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/5">
              {filteredEmpresas.map((empresa) => {
                const record = contabilData[empresa.id];
                const isExpanded = expanded === empresa.id;
                
                return (
                  <React.Fragment key={empresa.id}>
                    <tr 
                      className={`group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all ${isExpanded ? 'bg-primary/[0.03]' : ''}`}
                      onClick={() => toggleExpand(empresa.id)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 border border-border/10 group-hover:border-primary/20 transition-all">
                            <Calculator size={18} className={isExpanded ? "text-primary" : "text-muted-foreground/60 transition-colors group-hover:text-primary"} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-foreground text-sm uppercase italic tracking-tight truncate max-w-[250px] leading-tight group-hover:text-primary transition-colors">{empresa.nome_empresa}</span>
                            <span className="text-[9px] text-muted-foreground/40 font-black uppercase font-mono tracking-wider mt-1">{empresa.cnpj || "CNPJ NÃO INFORMADO"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${record?.conciliacao_patrimonial_status === 'concluido' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {record?.conciliacao_patrimonial_status === 'concluido' ? 'CONCILIADA' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${record?.balanco_status === 'concluido' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/40 border border-border/10'}`}>
                          {record?.balanco_status === 'concluido' ? 'FECHADO' : 'ABERTO'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex justify-center gap-1">
                           {[record?.importacao_extratos_status, record?.conciliacao_patrimonial_status, record?.are_status, record?.balanco_status].map((s, i) => (
                             <div key={i} className={`w-1.5 h-1.5 rounded-full ${s === 'concluido' ? 'bg-emerald-500' : 'bg-black/10 dark:bg-white/10'}`} />
                           ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 pr-8 text-right">
                        <button className={`p-2 rounded-xl border transition-all ${isExpanded ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/40 border-border/10 group-hover:border-primary/50 group-hover:text-primary'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-black/[0.01] dark:bg-white/[0.01]">
                        <td colSpan={5} className="px-6 py-12 pt-8">
                        <div className="max-w-6xl mx-auto space-y-10">
                          <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="w-full space-y-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/10 pb-6">
                              <TabsList className="bg-black/5 dark:bg-white/5 p-1 rounded-xl h-14 border border-border/10 overflow-x-auto no-scrollbar justify-start">
                                <TabsTrigger value="rotinas" className="px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <ClipboardCheck size={14} /> Rotinas
                                </TabsTrigger>
                                <TabsTrigger value="fechamentos" className="px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <BookOpen size={14} /> Fechamentos
                                </TabsTrigger>
                                <TabsTrigger value="obrigacoes" className="px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <Calculator size={14} /> Obrigações
                                </TabsTrigger>
                                <TabsTrigger value="gestao" className="px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <BarChart3 size={14} /> Gestão
                                </TabsTrigger>
                                <TabsTrigger value="pastas" className="px-6 h-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                  <FolderOpen size={14} /> Drive
                                </TabsTrigger>
                              </TabsList>

                              <h3 className="text-xl font-black text-foreground uppercase tracking-tight italic flex items-center gap-3">
                                 <span className="w-2 h-8 bg-primary rounded-full" />
                                 Controle Técnico
                              </h3>
                            </div>

                            <TabsContent value="rotinas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                              {[
                                { id: 'importacao_extratos_status', label: 'Importação Extratos' },
                                { id: 'conciliacao_patrimonial_status', label: 'Conciliação Patrimonial' },
                                { id: 'lancamento_despesas_status', label: 'Lançamento Despesas' },
                                { id: 'controle_imobilizado_status', label: 'Controle Imobilizado' },
                                { id: 'apropriacao_despesas_status', label: 'Apropriação Despesas' },
                                { id: 'integracao_folha_fiscal_status', label: 'Integração Folha/Fiscal' },
                              ].map(field => (
                                <div key={field.id} className="p-6 bg-black/5 dark:bg-white/5 border border-border/10 rounded-2xl flex flex-col gap-4 group/field transition-all hover:border-primary/20">
                                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">{field.label}</span>
                                  <select 
                                    className="w-full h-12 px-4 rounded-xl border border-border/10 bg-card text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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

                            <TabsContent value="fechamentos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                              {[
                                { id: 'are_status', label: 'Resultado (ARE)' },
                                { id: 'balancete_status', label: 'Balancete Verificação' },
                                { id: 'balanco_status', label: 'Balanço Patrimonial' },
                                { id: 'dre_status', label: 'DRE' },
                                { id: 'dmpl_dlpa_status', label: 'DMPL / DLPA' },
                                { id: 'dfc_status', label: 'DFC' },
                                { id: 'notas_explicativas_status', label: 'Notas Explicativas' },
                              ].map(field => (
                                <div key={field.id} className="p-6 bg-black/5 dark:bg-white/5 border border-border/10 rounded-2xl flex flex-col gap-4 group/field transition-all hover:border-primary/20">
                                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">{field.label}</span>
                                  <select 
                                    className="w-full h-12 px-4 rounded-xl border border-border/10 bg-card text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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

                            <TabsContent value="obrigacoes" className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                              {[
                                { id: 'ecd_status', label: 'ECD (DIGITAL)' },
                                { id: 'ecf_status', label: 'ECF (FISCAL)' },
                                { id: 'ibge_status', label: 'PESQUISA IBGE' },
                              ].map(field => (
                                <div key={field.id} className="p-6 bg-black/5 dark:bg-white/5 border border-border/10 rounded-2xl flex flex-col gap-4 group/field transition-all hover:border-primary/20">
                                  <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">{field.label}</span>
                                  <select 
                                    className="w-full h-12 px-4 rounded-xl border border-border/10 bg-card text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer"
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

                            <TabsContent value="gestao" className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="p-8 bg-black/5 dark:bg-white/5 border border-border/10 rounded-3xl space-y-6">
                                    <div className="flex items-center gap-3 border-b border-border/5 pb-4">
                                       <BarChart3 size={18} className="text-primary" />
                                       <span className="text-[10px] font-black uppercase text-foreground tracking-widest italic">Análise de Índices</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6">
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Liquidez Corrente</label>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          className="h-12 bg-card border-border/10 text-[11px] font-black focus-visible:ring-primary/20 rounded-xl"
                                          value={editForm[empresa.id]?.indices_financeiros?.liquidez_corrente || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, liquidez_corrente: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest pl-1">Endividamento</label>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          className="h-12 bg-card border-border/10 text-[11px] font-black focus-visible:ring-primary/20 rounded-xl"
                                          value={editForm[empresa.id]?.indices_financeiros?.endividamento || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, endividamento: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-8 bg-black/5 dark:bg-white/5 border border-border/10 rounded-3xl flex flex-col justify-between">
                                    <div className="space-y-4">
                                      <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic mb-4 block">Distribuição de Lucros</span>
                                      <select 
                                        className="w-full h-12 px-4 rounded-xl border border-border/10 bg-card text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                                        value={editForm[empresa.id]?.distribuicao_lucros_status || "pendente"}
                                        onChange={(e) => handleUpdateField(empresa.id, 'distribuicao_lucros_status', e.target.value)}
                                      >
                                        {Object.entries(statusLabels).map(([val, label]) => (
                                          <option key={val} value={val}>{label.toUpperCase()}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/40 font-black italic mt-6 border-t border-border/5 pt-4">Controle de apuração e destinação de dividendos.</p>
                                  </div>

                                  <div className="p-8 bg-black/5 dark:bg-white/5 border border-border/10 rounded-3xl flex flex-col justify-between">
                                    <div className="space-y-4">
                                      <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic mb-4 block">Emissão de DECORE</span>
                                      <select 
                                        className="w-full h-12 px-4 rounded-xl border border-border/10 bg-card text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                                        value={editForm[empresa.id]?.decore_status || "pendente"}
                                        onChange={(e) => handleUpdateField(empresa.id, 'decore_status', e.target.value)}
                                      >
                                        {Object.entries(statusLabels).map(([val, label]) => (
                                          <option key={val} value={val}>{label.toUpperCase()}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/40 font-black italic mt-6 border-t border-border/5 pt-4">Declaração de Comprovação de Percepção de Rendimentos.</p>
                                  </div>
                               </div>
                            </TabsContent>

                            <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-500 outline-none">
                               <ModuleFolderView empresa={empresa} departamentoId="contabil" />
                            </TabsContent>

                            <div className="mt-12 flex justify-end gap-4 border-t border-border/10 pt-8">
                              <button 
                                onClick={() => setExpanded(null)}
                                className="h-14 px-10 text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground transition-colors"
                              >
                                CANCELAR
                              </button>
                              <button 
                                onClick={() => handleSave(empresa.id)}
                                className="button-premium px-12 h-14 text-[11px] tracking-[0.2em] shadow-2xl shadow-primary/20 group"
                              >
                                <Save size={18} className="group-hover:scale-110 transition-transform" /> <span>SALVAR CONTROLE</span>
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
            <div className="flex flex-col items-center justify-center py-40 border-dashed border-border/10">
              <Search size={64} className="text-muted-foreground/10 mb-8" />
              <p className="text-[12px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] italic">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContabilPage;
