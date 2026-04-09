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
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Departamento <span className="text-primary/90">Contábil</span></h1>
            <FavoriteToggleButton moduleId="contabil" />
          </div>
          <p className="subtitle-premium">Gestão de rotinas contábeis, fechamentos e indicadores financeiros.</p>
        </div>

        <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 h-12 shadow-sm">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Competência:</span>
          <input 
            type="month" 
            value={competencia} 
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold transition-all"
          />
        </div>
      </div>

      <div className="card-premium !p-6">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            placeholder="Buscar empresa por nome ou CNPJ..." 
            className="w-full pl-12 pr-4 py-3 bg-muted/20 border border-border/40 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
        {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveStatusTab(t as any)} 
            className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeStatusTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "entregue" ? "ENTREGUES" : t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-4 text-left font-semibold">Empresa</th>
                <th className="px-4 py-4 text-center font-semibold">Rotinas</th>
                <th className="px-4 py-4 text-center font-semibold">Fechamentos</th>
                <th className="px-4 py-4 text-center font-semibold">Status Geral</th>
                <th className="px-4 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmpresas.map((empresa) => {
                const record = contabilData[empresa.id];
                const isExpanded = expanded === empresa.id;
                
                return (
                  <React.Fragment key={empresa.id}>
                    <tr className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-bold text-foreground">{empresa.nome_empresa}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{empresa.cnpj}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="secondary" className="font-medium">
                          {record?.conciliacao_patrimonial_status === 'concluido' ? 'Conciliada' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="outline" className={record?.balanco_status === 'concluido' ? 'text-green-500 border-green-500/20 bg-green-500/5' : ''}>
                          {record?.balanco_status === 'concluido' ? 'Fechado' : 'Aberto'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center -space-x-1">
                           {[record?.importacao_extratos_status, record?.conciliacao_patrimonial_status, record?.are_status, record?.balanco_status].map((s, i) => (
                             <div key={i} className={`w-2 h-2 rounded-full border border-background ${s === 'concluido' ? 'bg-green-500' : 'bg-muted'}`} />
                           ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => toggleExpand(empresa.id)}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-6 py-6 bg-muted/20 border-t border-border">
                          <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="w-full">
                            <TabsList className="mb-6">
                              <TabsTrigger value="rotinas" className="gap-2">
                                <ClipboardCheck size={16} /> Rotinas Mensais
                              </TabsTrigger>
                              <TabsTrigger value="fechamentos" className="gap-2">
                                <BookOpen size={16} /> Fechamentos
                              </TabsTrigger>
                              <TabsTrigger value="obrigacoes" className="gap-2">
                                <Calculator size={16} /> Obrigações
                              </TabsTrigger>
                              <TabsTrigger value="gestao" className="gap-2">
                                <BarChart3 size={16} /> Gestão/Consultoria
                              </TabsTrigger>
                              <TabsTrigger value="pastas" className="gap-2">
                                <FolderOpen size={16} /> Arquivos / Pastas
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="rotinas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {[
                                { id: 'importacao_extratos_status', label: 'Importação e Classificação de Extratos' },
                                { id: 'conciliacao_patrimonial_status', label: 'Conciliação de Contas Patrimoniais' },
                                { id: 'lancamento_despesas_status', label: 'Lançamento de Despesas' },
                                { id: 'controle_imobilizado_status', label: 'Controle de Imobilizado' },
                                { id: 'apropriacao_despesas_status', label: 'Apropriação de Despesas' },
                                { id: 'integracao_folha_fiscal_status', label: 'Integração Folha/Fiscal' },
                              ].map(field => (
                                <div key={field.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between group/field">
                                  <span className="text-xs font-semibold text-muted-foreground pr-2">{field.label}</span>
                                  <select 
                                    className="text-xs bg-muted border-none rounded p-1 outline-none font-medium cursor-pointer"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="fechamentos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {[
                                { id: 'are_status', label: 'Apuração de Resultado (ARE)' },
                                { id: 'balancete_status', label: 'Balancete de Verificação' },
                                { id: 'balanco_status', label: 'Balanço Patrimonial' },
                                { id: 'dre_status', label: 'DRE' },
                                { id: 'dmpl_dlpa_status', label: 'DMPL / DLPA' },
                                { id: 'dfc_status', label: 'DFC' },
                                { id: 'notas_explicativas_status', label: 'Notas Explicativas' },
                              ].map(field => (
                                <div key={field.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                                  <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
                                  <select 
                                    className="text-xs bg-muted border-none rounded p-1 outline-none font-medium"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="obrigacoes" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {[
                                { id: 'ecd_status', label: 'ECD (Digital)' },
                                { id: 'ecf_status', label: 'ECF (Fiscal)' },
                                { id: 'ibge_status', label: 'Pesquisa IBGE' },
                              ].map(field => (
                                <div key={field.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                                  <span className="text-xs font-semibold text-muted-foreground">{field.label}</span>
                                  <select 
                                    className="text-xs bg-muted border-none rounded p-1 outline-none font-medium"
                                    value={editForm[empresa.id]?.[field.id] || "pendente"}
                                    onChange={(e) => handleUpdateField(empresa.id, field.id, e.target.value)}
                                  >
                                    {Object.entries(statusLabels).map(([val, label]) => (
                                      <option key={val} value={val}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </TabsContent>

                            <TabsContent value="gestao" className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="p-4 bg-card border border-border rounded-lg space-y-2">
                                    <span className="text-xs font-bold uppercase text-muted-foreground">Análise de Índices</span>
                                    <div className="grid grid-cols-1 gap-2 mt-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span>Liquidez Corrente</span>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          className="h-7 w-20 text-right"
                                          value={editForm[empresa.id]?.indices_financeiros?.liquidez_corrente || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, liquidez_corrente: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span>Endividamento</span>
                                        <Input 
                                          type="number" 
                                          step="0.01" 
                                          className="h-7 w-20 text-right"
                                          value={editForm[empresa.id]?.indices_financeiros?.endividamento || 0}
                                          onChange={(e) => handleUpdateField(empresa.id, 'indices_financeiros', { ...editForm[empresa.id]?.indices_financeiros, endividamento: parseFloat(e.target.value) })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">Distribuição de Lucros</span>
                                    <select 
                                      className="text-xs bg-muted border-none rounded p-1 outline-none font-medium"
                                      value={editForm[empresa.id]?.distribuicao_lucros_status || "pendente"}
                                      onChange={(e) => handleUpdateField(empresa.id, 'distribuicao_lucros_status', e.target.value)}
                                    >
                                      {Object.entries(statusLabels).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">Emissão de DECORE</span>
                                    <select 
                                      className="text-xs bg-muted border-none rounded p-1 outline-none font-medium"
                                      value={editForm[empresa.id]?.decore_status || "pendente"}
                                      onChange={(e) => handleUpdateField(empresa.id, 'decore_status', e.target.value)}
                                    >
                                      {Object.entries(statusLabels).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                  </div>
                               </div>
                            </TabsContent>

                            <TabsContent value="pastas" className="animate-in slide-in-from-right-4 duration-300">
                               <ModuleFolderView empresa={empresa} departamentoId="contabil" />
                            </TabsContent>

                            <div className="mt-8 flex justify-end gap-3 border-t border-border pt-6">
                              <Button variant="outline" onClick={() => setExpanded(null)}>Cancelar</Button>
                              <Button className="gap-2" onClick={() => handleSave(empresa.id)}>
                                <Save size={16} /> Salvar Alterações
                              </Button>
                            </div>
                          </Tabs>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContabilPage;
