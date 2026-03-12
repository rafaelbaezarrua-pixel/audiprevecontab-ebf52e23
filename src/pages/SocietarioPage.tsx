
import React, { useState } from "react";
import { 
  Building2, Search, Filter, ChevronDown, 
  Plus, History, Activity, Star, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSocietario } from "@/hooks/useSocietario";
import { EmpresaTable } from "@/components/societario/EmpresaTable";
import { SocietarioStats } from "@/components/societario/SocietarioStats";
import { NovoProcessoForm } from "@/components/societario/NovoProcessoForm";
import { ProcessoCard } from "@/components/societario/ProcessoCard";
import { TableSkeleton, PageHeaderSkeleton } from "@/components/PageSkeleton";
import { syncCompanyClients } from "@/lib/sync-clients";
import { tipoProcessoLabels, passosConfig } from "@/constants/societario";
import { Empresa, Processo } from "@/types/societario";
import { SocietarioKanban } from "@/components/societario/SocietarioKanban";
import { LayoutGrid, List } from "lucide-react";

const SocietarioPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    empresas, processos, isLoading, 
    deleteProcesso, updateProcesso 
  } = useSocietario();

  const [activeMainTab, setActiveMainTab] = useState<"empresas" | "processos">("empresas");
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas" | "mei">("ativas");
  const [isFavorite, setIsFavorite] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSituacao, setFilterSituacao] = useState("todas");
  const [filterRegime, setFilterRegime] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [expandedProcesso, setExpandedProcesso] = useState<string | null>(null);
  const [processTab, setProcessTab] = useState<Record<string, 'timeline' | 'historico'>>({});
  const [processoToDelete, setProcessoToDelete] = useState<{ id: string, nome: string } | null>(null);
  const [processViewMode, setProcessViewMode] = useState<"list" | "kanban">("kanban");

  const [novoProcessoData, setNovoProcessoData] = useState({ 
    tipo: 'abertura', 
    nome_empresa: '', 
    empresa_id: null as string | null,
    numero_processo: '', 
    data_inicio: new Date().toISOString().split('T')[0],
    eventos: [] as string[]
  });

  const handleCreateProcesso = async () => {
    // Basic validation
    if (novoProcessoData.tipo === 'alteracao' && !novoProcessoData.empresa_id) {
      toast.error("Selecione a empresa para alteração"); return;
    }
    if (novoProcessoData.tipo !== 'alteracao' && !novoProcessoData.nome_empresa) {
      toast.error("Preencha o nome da empresa"); return;
    }
    
    let finalNome = novoProcessoData.nome_empresa;
    if (novoProcessoData.tipo === 'alteracao' && novoProcessoData.empresa_id) {
      finalNome = empresas.find(e => e.id === novoProcessoData.empresa_id)?.nome_empresa || '';
    }

    const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await (await import("@/integrations/supabase/client")).supabase.from("processos_societarios" as any).insert([{
      ...novoProcessoData,
      empresa_id: novoProcessoData.empresa_id || null,
      nome_empresa: finalNome,
      current_step: 'envio_dbe_at'
    }]).select().single();

    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else {
      await (await import("@/integrations/supabase/client")).supabase.from("processos_societarios_historico" as any).insert({
        processo_id: (data as any).id,
        usuario_id: user.id,
        acao: 'PROCESSO_INICIADO',
        detalhes: `Tipo: ${tipoProcessoLabels[novoProcessoData.tipo]}`
      });
      toast.success("Processo iniciado!");
      setShowNovoProcesso(false);
      // Invalidate queries via hook or directly if needed
      window.location.reload(); // Simple way for now, or use queryClient
    }
  };

  const filteredEmpresas = empresas.filter((e) => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchSituacao = filterSituacao === "todas" || e.situacao === filterSituacao;
    const matchRegime = filterRegime === "todos" || e.regime_tributario === filterRegime;
    let matchTab = false;
    if (activeTab === "ativas") matchTab = !e.situacao || e.situacao === "ativa";
    else if (activeTab === "paralisadas") matchTab = e.situacao === "paralisada";
    else if (activeTab === "baixadas") matchTab = e.situacao === "baixada";
    else if (activeTab === "mei") matchTab = e.porte_empresa === "mei" && (!e.situacao || e.situacao === "ativa");
    return matchSearch && matchSituacao && matchRegime && matchTab;
  });

  const stats = {
    ativas: empresas.filter(e => !e.situacao || e.situacao === "ativa").length,
    paralisadas: empresas.filter(e => e.situacao === "paralisada").length,
    baixadas: empresas.filter(e => e.situacao === "baixada").length,
    mei: empresas.filter(e => e.porte_empresa === "mei" && (!e.situacao || e.situacao === "ativa")).length,
    processosAtivos: processos.filter(p => p.status === 'em_andamento').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Tabs */}
      <div className="flex border-b border-border">
        <button onClick={() => setActiveMainTab("empresas")} className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${activeMainTab === "empresas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2 underline-offset-8">
            <Building2 size={18} /> EMPRESAS
          </div>
        </button>
        <button onClick={() => setActiveMainTab("processos")} className={`pb-3 px-6 text-sm font-bold transition-all border-b-2 ${activeMainTab === "processos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          <div className="flex items-center gap-2">
            <Activity size={18} /> PROCESSOS
            {stats.processosAtivos > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">{stats.processosAtivos}</span>}
          </div>
        </button>
      </div>

      {activeMainTab === "empresas" ? (
        <div className="space-y-6 animate-in slide-in-from-left-2 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="header-title">Societário</h1>
              <p className="text-muted-foreground mt-1">Gestão de empresas e processos de constituição/alteração.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-2.5 rounded-xl border transition-all ${isFavorite ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-sm shadow-amber-500/10" : "bg-card border-border text-muted-foreground hover:bg-muted hover:border-border/80"}`}
              >
                <Star size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              <button
                onClick={async () => {
                  const confirmed = window.confirm("Sincronizar todos os acessos do portal?");
                  if (!confirmed) return;
                  const id = toast.loading("Sincronizando...");
                  try {
                    await syncCompanyClients(() => {});
                    toast.success("Sincronizado!", { id });
                  } catch (e: any) { toast.error(e.message, { id }); }
                }}
                className="button-secondary-premium"
              >
                <RefreshCw size={18} /> Sincronizar Acessos
              </button>
              <button onClick={() => navigate("/societario/nova")} className="button-premium">
                <Plus size={18} /> Nova Empresa
              </button>
            </div>
          </div>

          <SocietarioStats stats={stats} />

          <div className="card-premium !p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full flex items-center">
                <Search size={18} className="absolute left-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou CNPJ..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 border border-border/50 rounded-2xl bg-muted/30 text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border ${showFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                <Filter size={18} /> Filtros <ChevronDown size={14} className={showFilters ? "rotate-180" : ""} />
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Regime</label>
                  <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-background text-sm">
                    <option value="todos">Todos</option>
                    <option value="simples">Simples Nacional</option>
                    <option value="lucro_presumido">Lucro Presumido</option>
                    <option value="lucro_real">Lucro Real</option>
                    <option value="mei">MEI</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Situação</label>
                  <select value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)} className="w-full px-4 py-2 border rounded-xl bg-background text-sm">
                    <option value="todas">Todas</option>
                    <option value="ativa">Ativa</option>
                    <option value="paralisada">Paralisada</option>
                    <option value="baixada">Baixada</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setSearch(""); setFilterSituacao("todas"); setFilterRegime("todos"); }} className="text-xs text-primary font-black uppercase tracking-widest px-4 py-2">Limpar</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex border-b border-border overflow-x-auto no-scrollbar pt-2">
            {["ativas", "mei", "paralisadas", "baixadas"].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`px-6 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t.toUpperCase()}</button>
            ))}
          </div>

          <EmpresaTable empresas={filteredEmpresas} />
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-card-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><History size={24} /></div>
                Processos Societários
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
                <button 
                  onClick={() => setProcessViewMode("kanban")}
                  className={`p-2 rounded-lg transition-all ${processViewMode === "kanban" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setProcessViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${processViewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List size={18} />
                </button>
              </div>
              <button onClick={() => setShowNovoProcesso(true)} className="button-premium">
                <Plus size={20} /> Novo Processo
              </button>
            </div>
          </div>

          {showNovoProcesso && (
            <NovoProcessoForm 
              empresas={empresas}
              novoProcessoData={novoProcessoData}
              setNovoProcessoData={setNovoProcessoData}
              onSubmit={handleCreateProcesso}
              onCancel={() => setShowNovoProcesso(false)}
            />
          )}

          {processos.length === 0 ? (
            <div className="card-premium text-center py-24 text-muted-foreground">Nenhum processo em andamento</div>
          ) : processViewMode === "kanban" ? (
            <SocietarioKanban 
              processos={processos} 
              onViewDetails={(p) => setExpandedProcesso(p.id)}
              onUpdateStatus={(id, status) => {
                if (status === "foi_arquivado") {
                  updateProcesso.mutate({ id, updates: { foi_arquivado: true, arquivamento_junta_at: new Date().toISOString() } });
                } else if (status === "pending") {
                  const reset: any = {};
                  passosConfig.forEach(p => reset[p.id] = null);
                  updateProcesso.mutate({ id, updates: { ...reset, foi_arquivado: false } });
                } else {
                  updateProcesso.mutate({ id, updates: { [status]: new Date().toISOString() } });
                }
              }}
            />
          ) : (
            <div className="space-y-6">
              {processos.map(p => (
                <ProcessoCard 
                  key={p.id}
                  processo={p}
                  isExpanded={expandedProcesso === p.id}
                  onToggleExpand={() => setExpandedProcesso(expandedProcesso === p.id ? null : p.id)}
                  onDelete={(id, nome) => setProcessoToDelete({ id, nome })}
                  activeTab={processTab[p.id] || 'timeline'}
                  onTabChange={(tab) => setProcessTab({ ...processTab, [p.id]: tab })}
                  onUpdatePasso={(id, campo, value) => updateProcesso.mutate({ id, updates: { [campo]: value } })}
                  onUpdateDetalhePasso={(id, stepId, field, value) => {
                    const novosDetalhes = { ...p.detalhes_passos };
                    novosDetalhes[stepId] = { ...novosDetalhes[stepId], [field]: value };
                    updateProcesso.mutate({ id, updates: { detalhes_passos: novosDetalhes } });
                  }}
                  onFinalize={(proc) => {
                    if (proc.tipo === 'alteracao' && proc.empresa_id) {
                      navigate(`/societario/${proc.empresa_id}`, { state: { nome: proc.nome_empresa, processoId: proc.id } });
                    } else {
                      navigate("/societario/nova", { state: { nome: proc.nome_empresa, processoId: proc.id } });
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {processoToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6">
            <h2 className="text-xl font-bold">Excluir Processo?</h2>
            <p className="text-muted-foreground mt-2 text-sm">Ação irreversível para <strong>{processoToDelete.nome}</strong>.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setProcessoToDelete(null)} className="px-4 py-2 text-sm font-bold">Cancelar</button>
              <button onClick={() => { deleteProcesso.mutate(processoToDelete.id); setProcessoToDelete(null); }} className="px-4 py-2 bg-destructive text-white rounded-xl text-sm font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietarioPage;
