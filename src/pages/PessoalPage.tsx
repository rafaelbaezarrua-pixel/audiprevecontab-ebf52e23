import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle, AlertTriangle, Calendar, Users, UserPlus, Trash2, Settings } from "lucide-react";
import { format, subDays, addDays, isBefore, parseISO } from "date-fns";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { usePessoal } from "@/hooks/usePessoal";
import { PessoalRecord, GuiaStatus } from "@/types/pessoal";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const PessoalPage: React.FC = () => {
  const navigate = useNavigate();
  const { empresas, loading } = useEmpresas("pessoal");
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei">("ativas");
  const [activeSubTab, setActiveSubTab] = useState<"folha" | "prolabore">("folha");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");
  const [funcionarios, setFuncionarios] = useState<Record<string, any[]>>({});
  const [alertsSummary, setAlertsSummary] = useState({ aso: 0, ferias: 0 });

  const { pessoalData, loading: pessoalLoading, savePessoalRecord } = usePessoal(competencia);

  useEffect(() => {
    const fetchAlerts = async () => {
      const today = new Date();
      const nextMonth = addDays(today, 30);
      
      const { data: allFuncs } = await (supabase.from("funcionarios" as any).select("*").eq("ativo", true) as any);
      if (allFuncs) {
        const aso = (allFuncs as any[]).filter(f => f.vencimento_aso && isBefore(parseISO(f.vencimento_aso), nextMonth)).length;
        const ferias = (allFuncs as any[]).filter(f => f.vencimento_ferias && isBefore(parseISO(f.vencimento_ferias), nextMonth)).length;
        setAlertsSummary({ aso, ferias });
        
        const map: Record<string, any[]> = {};
        (allFuncs as any[]).forEach(f => {
          if (!map[f.empresa_id]) map[f.empresa_id] = [];
          map[f.empresa_id].push(f);
        });
        setFuncionarios(map);
      }
    };
    fetchAlerts();
  }, []);

  const filtered = React.useMemo(() => {
    return empresas.filter(e => {
      const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

      let matchTab = false;
      if (activeTab === "ativas") {
        matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
      } else if (activeTab === "mei") {
        matchTab = e.situacao === "mei" || ((e.situacao === "ativa" || !e.situacao) && e.porte_empresa === "mei");
      }

      let matchSubTab = false;
      if (activeSubTab === "folha") {
        matchSubTab = !!e.possui_funcionarios;
      } else if (activeSubTab === "prolabore") {
        matchSubTab = !!e.somente_pro_labore && !e.possui_funcionarios;
      }

      let matchStatus = true;
      if (filterStatus !== "todos") {
        const record = pessoalData[e.id];
        if (!record) {
          matchStatus = filterStatus === 'pendente';
        } else {
          if (activeSubTab === "prolabore") {
            const isAllConcluido = !!record.dctf_web_gerada;
            matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
          } else {
            const checks = [];
            if (record.possui_vt) checks.push(record.vt_status);
            if (record.possui_va) checks.push(record.va_status);
            if (record.possui_vc) checks.push(record.vc_status);
            checks.push(record.inss_status);
            checks.push(record.fgts_status);
            
            const isAllConcluido = checks.every(s => s === 'enviada' || s === 'gerada' || s === 'isento') && record.dctf_web_gerada;
            matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
          }
        }
      }

      return matchSearch && matchTab && matchSubTab && matchStatus;
    });
  }, [empresas, pessoalData, search, activeTab, activeSubTab, filterStatus]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (pessoalData[id] || {}) as Partial<PessoalRecord> & Record<string, any>;
    
    let infoGerais = {
      forma_envio: "", qtd_funcionarios: 0, qtd_pro_labore: 0,
      possui_vt: false, possui_va: false, possui_vc: false,
      possui_recibos: false, qtd_recibos: 0
    };

    if (!existing.id) {
      const { data: prev } = await supabase.from("pessoal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        infoGerais = {
          forma_envio: prev[0].forma_envio || "",
          qtd_funcionarios: prev[0].qtd_funcionarios || 0,
          qtd_pro_labore: prev[0].qtd_pro_labore || 0,
          possui_vt: prev[0].possui_vt || false,
          possui_va: prev[0].possui_va || false,
          possui_vc: prev[0].possui_vc || false,
          possui_recibos: prev[0].possui_recibos || false,
          qtd_recibos: prev[0].qtd_recibos || 0
        };
      }
    } else {
      infoGerais = {
        forma_envio: existing.forma_envio || "",
        qtd_funcionarios: existing.qtd_funcionarios || 0,
        qtd_pro_labore: existing.qtd_pro_labore || 0,
        possui_vt: existing.possui_vt || false,
        possui_va: existing.possui_va || false,
        possui_vc: existing.possui_vc || false,
        possui_recibos: existing.possui_recibos || false,
        qtd_recibos: existing.qtd_recibos || 0
      };
    }

    setEditForm(prev => ({
      ...prev, [id]: {
        ...infoGerais,
        vt_status: existing.vt_status || "pendente", vt_data_envio: existing.vt_data_envio || "",
        va_status: existing.va_status || "pendente", va_data_envio: existing.va_data_envio || "",
        vc_status: existing.vc_status || "pendente", vc_data_envio: existing.vc_data_envio || "",
        inss_status: existing.inss_status || "pendente", inss_data_envio: existing.inss_data_envio || "",
        fgts_status: existing.fgts_status || "pendente", fgts_data_envio: existing.fgts_data_envio || "",
        dctf_web_gerada: existing.dctf_web_gerada || false, dctf_web_data_envio: existing.dctf_web_data_envio || "",
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = pessoalData[empresaId];
    try {
      const payload = {
        empresa_id: empresaId, competencia, forma_envio: form.forma_envio || null,
        qtd_funcionarios: parseInt(String(form.qtd_funcionarios || 0)) || 0, 
        qtd_pro_labore: parseInt(String(form.qtd_pro_labore || 0)) || 0,
        possui_vt: !!form.possui_vt, possui_va: !!form.possui_va,
        possui_vc: !!form.possui_vc, possui_recibos: !!form.possui_recibos,
        qtd_recibos: parseInt(String(form.qtd_recibos || 0)) || 0,
        vt_status: form.vt_status as GuiaStatus, vt_data_envio: form.vt_data_envio || null,
        va_status: form.va_status as GuiaStatus, va_data_envio: form.va_data_envio || null,
        vc_status: form.vc_status as GuiaStatus, vc_data_envio: form.vc_data_envio || null,
        inss_status: form.inss_status as GuiaStatus, inss_data_envio: form.inss_data_envio || null,
        fgts_status: form.fgts_status as GuiaStatus, fgts_data_envio: form.fgts_data_envio || null,
        dctf_web_gerada: !!form.dctf_web_gerada, dctf_web_data_envio: form.dctf_web_data_envio || null,
      };
      const success = await savePessoalRecord(payload);
      if (success) {
        toast.success("Dados salvos com sucesso!");
        setExpanded(null);
      }
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: string | number | boolean | null) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = filtered.filter(e => pessoalData[e.id]?.dctf_web_gerada).length;

  if (loading || pessoalLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeaderSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-12">
          <div className="px-4 flex items-center gap-2 border-r border-border/60">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Empresas</span>
            <span className="text-lg font-black text-primary">{filtered.length}</span>
          </div>
          <div className="px-4 flex items-center gap-2 border-r border-border/60">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Concluídas</span>
            <span className="text-lg font-black text-emerald-500">{completedCount}</span>
          </div>
          <div className="px-4 flex items-center gap-2 bg-warning/5">
            <span className="text-[10px] text-warning font-bold uppercase tracking-wider">Pendentes</span>
            <span className="text-lg font-black text-warning">{filtered.length - completedCount}</span>
          </div>
          <div className="px-4 flex items-center gap-4 bg-destructive/5 border-l border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">ASO Vencendo</span>
              <span className="text-lg font-black text-destructive">{alertsSummary.aso}</span>
            </div>
            <div className="flex items-center gap-2 border-l border-destructive/10 pl-4">
              <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">Férias 30d</span>
              <span className="text-lg font-black text-destructive">{alertsSummary.ferias}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <FavoriteToggleButton moduleId="pessoal" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] w-full sm:w-56"
            />
          </div>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 h-10 bg-card border border-border/60 rounded-xl focus:ring-2 focus:ring-primary outline-none text-[13px] font-medium"
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-lg self-end">
          <button 
            onClick={() => setFilterStatus("todos")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "todos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilterStatus("pendente")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "pendente" ? "bg-card text-orange-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilterStatus("concluido")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "concluido" ? "bg-card text-green-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Concluídos
          </button>
        </div>
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "ativas"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("ativas")}
        >
          Empresas Ativas
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "mei"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("mei")}
        >
          Empresas MEI
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === "folha"
              ? "bg-primary/10 text-primary"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveSubTab("folha")}
        >
          Folha de Pagamento
        </button>
        <button
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeSubTab === "prolabore"
              ? "bg-primary/10 text-primary"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveSubTab("prolabore")}
        >
          Pró-labore
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const done = pessoalData[emp.id]?.dctf_web_gerada;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  {activeSubTab === "prolabore" && (
                    <>
                      {/* Informações Simplificadas para Pró-labore */}
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Informações</h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div><label className={labelCls}>Qtd Pró-labore</label><input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className={inputCls} /></div>
                        </div>
                      </div>

                      {/* Apenas DCTF Web para Pró-labore */}
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Obrigações - {competencia}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                          <span className="text-sm font-medium text-card-foreground">DCTF Web (Pró-labore)</span>
                          <select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className={inputCls}>
                            <option value="nao">Não Gerada</option><option value="sim">Gerada</option>
                          </select>
                          {form.dctf_web_gerada ? (
                            <input type="date" value={form.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className={inputCls} />
                          ) : <div />}
                        </div>
                      </div>
                    </>
                  )}

                  {activeSubTab === "folha" && (
                    <>
                      {/* Informações */}
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Informações</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Qtd Funcionários</label><input type="number" value={form.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Qtd Pró-labore</label><input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className={inputCls} /></div>
                        </div>
                      </div>

                      {/* Trabalhistas */}
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Trabalhistas - {competencia}</h3>
                        <div className="space-y-3">
                          {/* Recibos - campo de quantidade */}
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer">
                              <input type="checkbox" checked={form.possui_recibos || false} onChange={e => updateForm(emp.id, "possui_recibos", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> Recibos
                            </label>
                            {form.possui_recibos ? (
                              <div><label className={labelCls}>Qtd Recibos</label><input type="number" value={form.qtd_recibos || 0} onChange={e => updateForm(emp.id, "qtd_recibos", e.target.value)} className={inputCls} /></div>
                            ) : <div />}
                            <div />
                          </div>
                          {/* VT, VA, VC - checkbox + status + data */}
                          {[
                            { label: "VT", checkKey: "possui_vt", statusKey: "vt_status", dateKey: "vt_data_envio" },
                            { label: "VA", checkKey: "possui_va", statusKey: "va_status", dateKey: "va_data_envio" },
                            { label: "VC", checkKey: "possui_vc", statusKey: "vc_status", dateKey: "vc_data_envio" },
                          ].map((item: { label: string; checkKey: keyof PessoalRecord; statusKey: keyof PessoalRecord; dateKey: keyof PessoalRecord }) => (
                            <div key={item.label} className="grid grid-cols-3 gap-3 items-center">
                              <label className="flex items-center gap-2 text-sm font-medium text-card-foreground cursor-pointer">
                                <input type="checkbox" checked={form[item.checkKey] || false} onChange={e => updateForm(emp.id, item.checkKey, e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> {item.label}
                              </label>
                              {form[item.checkKey] ? (
                                <>
                                  <select value={form[item.statusKey] || "pendente"} onChange={e => updateForm(emp.id, item.statusKey, e.target.value)} className={inputCls}>
                                    <option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option>
                                  </select>
                                  <input type="date" value={form[item.dateKey] || ""} onChange={e => updateForm(emp.id, item.dateKey, e.target.value)} className={inputCls} />
                                </>
                              ) : (<><div /><div /></>)}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Encargos */}
                      <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Encargos - {competencia}</h3>
                        <div className="space-y-3">
                          {([{ label: "INSS", statusKey: "inss_status", dateKey: "inss_data_envio" }, { label: "FGTS", statusKey: "fgts_status", dateKey: "fgts_data_envio" }] as const).map((enc) => (
                            <div key={enc.label} className="grid grid-cols-3 gap-3 items-center">
                              <span className="text-sm font-medium text-card-foreground">{enc.label}</span>
                              <select value={form[enc.statusKey] || "pendente"} onChange={e => updateForm(emp.id, enc.statusKey, e.target.value)} className={inputCls}>
                                <option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option>
                              </select>
                              <input type="date" value={form[enc.dateKey] || ""} onChange={e => updateForm(emp.id, enc.dateKey, e.target.value)} className={inputCls} />
                            </div>
                          ))}
                          <div className="grid grid-cols-3 gap-3 items-center">
                            <span className="text-sm font-medium text-card-foreground">DCTF Web</span>
                            <select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className={inputCls}>
                              <option value="nao">Não Gerada</option><option value="sim">Gerada</option>
                            </select>
                            {form.dctf_web_gerada ? (
                              <input type="date" value={form.dctf_web_data_envio || ""} onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)} className={inputCls} />
                            ) : <div />}
                          </div>
                        </div>
                      </div>

                      {/* Funcionários & Alertas */}
                      <div>
                        <div className="flex items-center justify-between mb-3 pt-3 border-t border-border">
                          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                            <Users size={16} className="text-primary" /> Funcionários & Alertas
                          </h3>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pessoal/funcionarios/${emp.id}`);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                          >
                            <Settings size={12} /> Gerenciar
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(funcionarios[emp.id] || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground italic bg-background/50 p-2 rounded-lg border border-dashed border-border">Nenhum funcionário cadastrado com alertas ativos.</p>
                          ) : (
                            funcionarios[emp.id].map(func => (
                              <div key={func.id} className="p-3 bg-background/50 rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">{func.nome}</p>
                                  <div className="flex flex-wrap gap-3 mt-1">
                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${func.vencimento_aso && isBefore(parseISO(func.vencimento_aso), addDays(new Date(), 30)) ? "text-destructive" : "text-muted-foreground"}`}>
                                      <AlertTriangle size={12} /> ASO: {func.vencimento_aso ? formatDateBR(func.vencimento_aso) : "N/D"}
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${func.vencimento_ferias && isBefore(parseISO(func.vencimento_ferias), addDays(new Date(), 30)) ? "text-destructive" : "text-muted-foreground"}`}>
                                      <Calendar size={12} /> Férias: {func.vencimento_ferias ? formatDateBR(func.vencimento_ferias) : "N/D"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end"><button onClick={() => handleSave(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Save size={14} /> Salvar</button></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PessoalPage;
