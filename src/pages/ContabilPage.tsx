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
import { EmpresaAccordion } from "@/components/EmpresaAccordion";
import { cn, formatMonthYearBR, formatDateBR } from "@/lib/utils";

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
        indices_financeiros: (existing as any).indices_financeiros || { liquidez_corrente: 0, endividamento: 0, rentabilidade: 0 }
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
    <div className="space-y-4 animate-fade-in relative pb-10 px-0">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1 -mt-6">
          <div className="flex items-center gap-2">
             <h1 className="header-title">Gestão <span className="text-primary/90 font-black">Contábil</span></h1>
             <FavoriteToggleButton moduleId="contabil" />
          </div>
          <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Escrituração, conciliação e balancetes corporativos.</p>
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

      {/* Main Content -> Agora Accordions com Cabeçalho Rico */}
      <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_60px] px-6 py-3 bg-black/[0.03] dark:bg-white/[0.02] rounded-t-2xl border border-border/10 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 shadow-inner italic mb-0 relative z-4">
        <span>Empresa</span>
        <span className="text-center">Competência</span>
        <span className="text-center">Movimento</span>
        <span className="text-center">Integração</span>
        <span className="text-center">Status</span>
        <span className="text-right pr-2">Opções</span>
      </div>

      <div className="space-y-3 relative z-1">
        {filteredEmpresas.map((empresa) => {
          const record = contabilData[empresa.id];
          const isExpanded = expanded === empresa.id;
          const isDone = record?.balanco_status === 'concluido';
          
          const isMovimentoOk = record?.balancete_status === 'concluido';
          const isIntegracaoOk = record?.integracao_folha_fiscal_status === 'concluido';

          const customHeader = (
            <div className="md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_60px] items-center w-full py-1">
              {/* Empresa */}
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 border",
                  isExpanded ? "bg-primary text-white border-primary shadow-lg" : "bg-black/5 dark:bg-white/5 border-border/10 group-hover:border-primary/20"
                )}>
                  <Calculator size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn(
                    "font-black text-[13px] uppercase tracking-tight truncate transition-colors",
                    isExpanded ? "text-primary" : "text-foreground group-hover:text-primary"
                  )}>
                    {empresa.nome_empresa}
                  </span>
                  <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest italic">
                    CNPJ: {empresa.cnpj}
                  </span>
                </div>
              </div>

              {/* Competência */}
              <div className="hidden md:block text-center text-[11px] font-black text-muted-foreground/80 font-mono">
                {formatMonthYearBR(competencia)}
              </div>

              {/* Movimento */}
              <div className="hidden md:flex justify-center">
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                  isMovimentoOk ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {isMovimentoOk ? "OK" : "PENDENTE"}
                </span>
              </div>

              {/* Integração */}
              <div className="hidden md:flex justify-center">
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm",
                  isIntegracaoOk ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                )}>
                  {isIntegracaoOk ? "SINC" : "PEND"}
                </span>
              </div>

              {/* Status */}
              <div className="hidden md:flex justify-center">
                <span className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all animate-in fade-in zoom-in-95",
                  isDone ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}>
                  {isDone ? "CONCLUÍDO" : "PENDENTE"}
                </span>
              </div>

              {/* Opções */}
              <div className="flex justify-end pr-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border",
                  isExpanded ? "bg-primary text-white border-primary shadow-lg rotate-180" : "bg-black/5 dark:bg-white/5 border-border/10 text-muted-foreground/80"
                )}>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          );

          return (
            <EmpresaAccordion
              key={empresa.id}
              isOpen={isExpanded}
              onClick={() => toggleExpand(empresa.id)}
              customHeader={customHeader}
            >
              <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="w-full space-y-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-border/10 pb-3">
                    <TabsList className="bg-black/10 dark:bg-white/10 p-0.5 rounded-xl h-9 border border-border/10 shadow-inner overflow-x-auto no-scrollbar">
                      <TabsTrigger value="rotinas" className="px-5 h-7 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <ClipboardCheck size={12} /> Rotinas
                      </TabsTrigger>
                      <TabsTrigger value="fechamentos" className="px-5 h-7 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <BookOpen size={12} /> Fechamentos
                      </TabsTrigger>
                      <TabsTrigger value="obrigacoes" className="px-5 h-7 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <Calculator size={12} /> Obrigações
                      </TabsTrigger>
                      <TabsTrigger value="gestao" className="px-5 h-7 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <BarChart3 size={12} /> Gestão
                      </TabsTrigger>
                      <TabsTrigger value="pastas" className="px-5 h-7 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">
                        <FolderOpen size={12} /> Arquivos
                      </TabsTrigger>
                    </TabsList>

                    <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 opacity-40">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                      ID: {empresa.id.slice(0, 8).toUpperCase()}
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
                      <div key={field.id} className="p-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-inner">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1 opacity-60 italic">{field.label}</span>
                        <select 
                          className="w-full h-10 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
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
                      <div key={field.id} className="p-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-inner">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1 opacity-60 italic">{field.label}</span>
                        <select 
                          className="w-full h-10 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
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
                      <div key={field.id} className="p-3 bg-black/5 dark:bg-white/5 border border-border/10 rounded-xl flex flex-col gap-1.5 group/field hover:border-primary/30 transition-all shadow-inner">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1 opacity-60 italic">{field.label}</span>
                        <select 
                          className="w-full h-10 px-3 bg-card border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
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

                  <TabsContent value="gestao" className="space-y-4 animate-in fade-in duration-200 outline-none">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-black/5 border border-border/10 rounded-2xl relative shadow-inner">
                          <div className="flex items-center gap-2 border-b border-border/5 pb-2 mb-4">
                             <BarChart3 size={14} className="text-primary" />
                             <span className="text-[10px] font-black uppercase text-foreground tracking-widest italic">Análise de Índices</span>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest pl-1 italic">Liquidez Corrente</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-full h-10 px-4 bg-card border border-border/10 rounded-xl text-[12px] font-black focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-sm"
                                value={editForm[empresa.id]?.indices_financeiros?.liquidez_corrente || 0}
                                onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, liquidez_corrente: parseFloat(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-foreground uppercase tracking-widest pl-1 italic">Endividamento</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                className="w-full h-10 px-4 bg-card border border-border/10 rounded-xl text-[12px] font-black focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-sm"
                                value={editForm[empresa.id]?.indices_financeiros?.endividamento || 0}
                                onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, endividamento: parseFloat(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-black/5 border border-border/10 rounded-2xl flex flex-col justify-between shadow-inner">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest block pl-1 italic">Distribuição Lucros</span>
                            <select 
                              className="w-full h-10 px-3 bg-card border border-border/10 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
                              value={editForm[empresa.id]?.distribuicao_lucros_status || "pendente"}
                              onChange={(e) => handleUpdateField(empresa.id, 'distribuicao_lucros_status', e.target.value)}
                            >
                              {Object.entries(statusLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[8px] text-muted-foreground/40 font-black mt-4 uppercase tracking-[0.2em] italic">Dividendos e JCP</p>
                        </div>

                        <div className="p-4 bg-black/5 border border-border/10 rounded-2xl flex flex-col justify-between shadow-inner">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest block pl-1 italic">Emissão DECORE</span>
                            <select 
                              className="w-full h-10 px-3 bg-card border border-border/10 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm cursor-pointer"
                              value={editForm[empresa.id]?.decore_status || "pendente"}
                              onChange={(e) => handleUpdateField(empresa.id, 'decore_status', e.target.value)}
                            >
                              {Object.entries(statusLabels).map(([val, label]) => (
                                <option key={val} value={val}>{label.toUpperCase()}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[8px] text-muted-foreground/40 font-black mt-4 uppercase tracking-[0.2em] italic">Rendimentos Sócios</p>
                        </div>
                     </div>
                  </TabsContent>

                  <TabsContent value="pastas" className="animate-in slide-in-from-right-1 duration-200 outline-none">
                     <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden shadow-inner h-[400px]">
                       <ModuleFolderView empresa={empresa} departamentoId="contabil" />
                     </div>
                  </TabsContent>

                  <div className="mt-4 flex justify-end gap-3 border-t border-border/5 pt-4">
                    <button 
                      onClick={() => handleSave(empresa.id)}
                      className="h-10 px-10 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] group"
                    >
                      <Save size={14} className="group-hover:translate-y-[-1px] transition-transform" /> 
                      GRAVAR ALTERAÇÕES
                    </button>
                  </div>
                </Tabs>
              </div>
            </EmpresaAccordion>
          );
        })}
        {filteredEmpresas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-black/[0.02] dark:bg-white/[0.01] rounded-xl border border-dashed border-border/10">
            <Search size={32} className="text-muted-foreground/10 mb-4" />
            <p className="text-[12px] font-black text-muted-foreground/30 uppercase tracking-widest italic">Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContabilPage;
