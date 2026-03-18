import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { FiscalRecord, GuiaStatus } from "@/types/fiscal";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const FiscalPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("fiscal");
  const [fiscalData, setFiscalData] = useState<Record<string, FiscalRecord>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
      const map: Record<string, FiscalRecord> = {};
      data?.forEach(f => { map[f.empresa_id] = f as unknown as FiscalRecord; });
      setFiscalData(map);
    };
    load();
  }, [competencia]);

  const filtered = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

    let matchTab = false;
    if (activeTab === "ativas") {
      matchTab = (e.situacao === "ativa" || !e.situacao) && e.porte_empresa !== "mei";
    } else if (activeTab === "mei") {
      matchTab = e.situacao === "mei" || ((e.situacao === "ativa" || !e.situacao) && e.porte_empresa === "mei");
    } else if (activeTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    } else if (activeTab === "entregue") {
      matchTab = e.situacao === "entregue";
    }

    let matchStatus = true;
    if (filterStatus !== "todos") {
      const record = fiscalData[e.id];
      const items = e.regime_tributario === 'simples' ? ['status_guia'] : 
                    e.regime_tributario === 'lucro_presumido' || e.regime_tributario === 'lucro_real' ? 
                    ['irpj_csll_status', 'pis_cofins_status', 'icms_status', 'iss_status'] : [];
      
      if (items.length > 0) {
        const statuses = items.map(field => record?.[field as keyof FiscalRecord] || 'pendente');
        const isAllConcluido = statuses.every(s => s === 'enviada' || s === 'gerada' || s === 'isento');
        matchStatus = filterStatus === 'concluido' ? isAllConcluido : !isAllConcluido;
      } else {
        matchStatus = filterStatus === 'pendente';
      }
    }

    return matchSearch && matchTab && matchStatus;
  });

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = (fiscalData[id] || {}) as Partial<FiscalRecord>;
    let fixedFields = {
      tipo_nota: "", recebimento_arquivos: "", aliquota: "", ramo_empresarial: "",
      aliquota_irpj: "", aliquota_csll: "", aliquota_pis: "", aliquota_cofins: "",
      aliquota_icms: "", aliquota_iss: "", aliquota_cbs: "", aliquota_ibs: ""
    };

    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("*").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = {
          tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota?.toString() || "", ramo_empresarial: prev[0].ramo_empresarial || "",
          aliquota_irpj: prev[0].aliquota_irpj?.toString() || "", aliquota_csll: prev[0].aliquota_csll?.toString() || "",
          aliquota_pis: prev[0].aliquota_pis?.toString() || "", aliquota_cofins: prev[0].aliquota_cofins?.toString() || "",
          aliquota_icms: prev[0].aliquota_icms?.toString() || "", aliquota_iss: prev[0].aliquota_iss?.toString() || "",
          aliquota_cbs: prev[0].aliquota_cbs?.toString() || "", aliquota_ibs: prev[0].aliquota_ibs?.toString() || ""
        };
      }
    } else {
      fixedFields = {
        tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota?.toString() || "", ramo_empresarial: existing.ramo_empresarial || "",
        aliquota_irpj: existing.aliquota_irpj?.toString() || "", aliquota_csll: existing.aliquota_csll?.toString() || "",
        aliquota_pis: existing.aliquota_pis?.toString() || "", aliquota_cofins: existing.aliquota_cofins?.toString() || "",
        aliquota_icms: existing.aliquota_icms?.toString() || "", aliquota_iss: existing.aliquota_iss?.toString() || "",
        aliquota_cbs: existing.aliquota_cbs?.toString() || "", aliquota_ibs: existing.aliquota_ibs?.toString() || ""
      };
    }

    setEditForm(prev => ({
      ...prev, [id]: {
        ...fixedFields, forma_envio: existing.forma_envio || "",
        status_guia: existing.status_guia || "pendente", data_envio: existing.data_envio || "",
        irpj_csll_status: existing.irpj_csll_status || "pendente", irpj_csll_data_envio: existing.irpj_csll_data_envio || "",
        pis_cofins_status: existing.pis_cofins_status || "pendente", pis_cofins_data_envio: existing.pis_cofins_data_envio || "",
        icms_status: existing.icms_status || "pendente", icms_data_envio: existing.icms_data_envio || "",
        iss_status: existing.iss_status || "pendente", iss_data_envio: existing.iss_data_envio || "",
        cbs_status: existing.cbs_status || "pendente", cbs_data_envio: existing.cbs_data_envio || "",
        ibs_status: existing.ibs_status || "pendente", ibs_data_envio: existing.ibs_data_envio || "",
        observacoes: existing.observacoes || {},
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = (editForm[empresaId] || {}) as Partial<FiscalRecord> & Record<string, any>;
    const existing = (fiscalData[empresaId] || {}) as Partial<FiscalRecord>;
    try {
      const payload = {
        empresa_id: empresaId, competencia, tipo_nota: form.tipo_nota || null,
        recebimento_arquivos: form.recebimento_arquivos || null, forma_envio: form.forma_envio || null,
        aliquota: form.aliquota ? parseFloat(String(form.aliquota)) : null,
        status_guia: form.status_guia || "pendente", data_envio: form.data_envio || null,
        observacoes: form.observacoes || {}, ramo_empresarial: form.ramo_empresarial || null,

        aliquota_irpj: form.aliquota_irpj ? parseFloat(String(form.aliquota_irpj)) : null,
        aliquota_csll: form.aliquota_csll ? parseFloat(String(form.aliquota_csll)) : null,
        irpj_csll_status: form.irpj_csll_status || "pendente",
        irpj_csll_data_envio: form.irpj_csll_data_envio || null,

        aliquota_pis: form.aliquota_pis ? parseFloat(String(form.aliquota_pis)) : null,
        aliquota_cofins: form.aliquota_cofins ? parseFloat(String(form.aliquota_cofins)) : null,
        pis_cofins_status: form.pis_cofins_status || "pendente",
        pis_cofins_data_envio: form.pis_cofins_data_envio || null,

        aliquota_icms: form.aliquota_icms ? parseFloat(String(form.aliquota_icms)) : null,
        icms_status: form.icms_status || "pendente",
        icms_data_envio: form.icms_data_envio || null,

        aliquota_iss: form.aliquota_iss ? parseFloat(String(form.aliquota_iss)) : null,
        iss_status: form.iss_status || "pendente",
        iss_data_envio: form.iss_data_envio || null,

        aliquota_cbs: form.aliquota_cbs ? parseFloat(String(form.aliquota_cbs)) : null,
        cbs_status: form.cbs_status || "pendente",
        cbs_data_envio: form.cbs_data_envio || null,

        aliquota_ibs: form.aliquota_ibs ? parseFloat(String(form.aliquota_ibs)) : null,
        ibs_status: form.ibs_status || "pendente",
        ibs_data_envio: form.ibs_data_envio || null,
      };
      if (existing?.id) {
        await supabase.from("fiscal").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("fiscal").insert(payload);
      }
      toast.success("Dados fiscais salvos!");
      const { data } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
      const map: Record<string, FiscalRecord> = {};
      data?.forEach(f => { map[f.empresa_id] = f as unknown as FiscalRecord; });
      setFiscalData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: string | number | boolean | null | Record<string, any>) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = filtered.filter(e => {
    const record = fiscalData[e.id];
    if (!record) return false;
    if (e.regime_tributario === "lucro_real") {
      return (record.irpj_csll_status === "enviada" || record.irpj_csll_status === "gerada");
    }
    return (record.status_guia === "enviada" || record.status_guia === "gerada");
  }).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
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
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "paralisadas"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("paralisadas")}
        >
          Empresas Paralisadas
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "baixadas"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("baixadas")}
        >
          Empresas Baixadas
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "entregue"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("entregue")}
        >
          Empresas Entregues
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const done = emp.regime_tributario === "lucro_real"
            ? (fiscalData[emp.id]?.irpj_csll_status === "enviada" || fiscalData[emp.id]?.irpj_csll_status === "gerada")
            : (fiscalData[emp.id]?.status_guia === "enviada" || fiscalData[emp.id]?.status_guia === "gerada");
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • {regimeLabels[emp.regime_tributario] || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  {/* Informações Iniciais Comuns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className={labelCls}>Tipo de Nota</label><input value={form.tipo_nota || ""} onChange={e => updateForm(emp.id, "tipo_nota", e.target.value)} className={inputCls} placeholder="NFE, NFCE, NFSE" /></div>
                    <div><label className={labelCls}>Recebimento de Arquivos</label><input value={form.recebimento_arquivos || ""} onChange={e => updateForm(emp.id, "recebimento_arquivos", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp..." /></div>
                    <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp..." /></div>
                    <div><label className={labelCls}>Ramo Empresarial</label><input value={form.ramo_empresarial || ""} onChange={e => updateForm(emp.id, "ramo_empresarial", e.target.value)} className={inputCls} placeholder="Ex: Comércio, Serviços..." /></div>
                  </div>

                  {emp.regime_tributario === "lucro_real" ? (
                    <div className="space-y-6">
                      {/* Impostos Federais */}
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Impostos Federais</h4>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">IRPJ / CSLL</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className={labelCls}>Alíquota IRPJ (%)</label><input value={form.aliquota_irpj || ""} onChange={e => updateForm(emp.id, "aliquota_irpj", e.target.value)} className={inputCls} placeholder="Ex: 15" /></div>
                            <div><label className={labelCls}>Alíquota CSLL (%)</label><input value={form.aliquota_csll || ""} onChange={e => updateForm(emp.id, "aliquota_csll", e.target.value)} className={inputCls} placeholder="Ex: 9" /></div>
                            <div><label className={labelCls}>Status (IRPJ/CSLL)</label><select value={form.irpj_csll_status || "pendente"} onChange={e => updateForm(emp.id, "irpj_csll_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                            <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.irpj_csll_data_envio || ""} onChange={e => updateForm(emp.id, "irpj_csll_data_envio", e.target.value)} className={inputCls} /></div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">PIS / COFINS</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className={labelCls}>Alíquota PIS (%)</label><input value={form.aliquota_pis || ""} onChange={e => updateForm(emp.id, "aliquota_pis", e.target.value)} className={inputCls} placeholder="Ex: 1.65" /></div>
                            <div><label className={labelCls}>Alíquota COFINS (%)</label><input value={form.aliquota_cofins || ""} onChange={e => updateForm(emp.id, "aliquota_cofins", e.target.value)} className={inputCls} placeholder="Ex: 7.6" /></div>
                            <div><label className={labelCls}>Status (PIS/COFINS)</label><select value={form.pis_cofins_status || "pendente"} onChange={e => updateForm(emp.id, "pis_cofins_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                            <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.pis_cofins_data_envio || ""} onChange={e => updateForm(emp.id, "pis_cofins_data_envio", e.target.value)} className={inputCls} /></div>
                          </div>
                        </div>
                      </div>

                      {/* Impostos Estaduais */}
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Impostos Estaduais (ICMS)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className={labelCls}>Alíquota ICMS (%)</label><input value={form.aliquota_icms || ""} onChange={e => updateForm(emp.id, "aliquota_icms", e.target.value)} className={inputCls} placeholder="Ex: 18" /></div>
                          <div><label className={labelCls}>Status da Guia</label><select value={form.icms_status || "pendente"} onChange={e => updateForm(emp.id, "icms_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                          <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.icms_data_envio || ""} onChange={e => updateForm(emp.id, "icms_data_envio", e.target.value)} className={inputCls} /></div>
                        </div>
                      </div>

                      {/* Impostos Municipais */}
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Impostos Municipais (ISS)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div><label className={labelCls}>Alíquota ISS (%)</label><input value={form.aliquota_iss || ""} onChange={e => updateForm(emp.id, "aliquota_iss", e.target.value)} className={inputCls} placeholder="Ex: 5" /></div>
                          <div><label className={labelCls}>Status da Guia</label><select value={form.iss_status || "pendente"} onChange={e => updateForm(emp.id, "iss_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                          <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.iss_data_envio || ""} onChange={e => updateForm(emp.id, "iss_data_envio", e.target.value)} className={inputCls} /></div>
                        </div>
                      </div>

                      {/* Reforma Tributária */}
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
                        <h4 className="text-sm font-bold text-foreground border-b border-border pb-2">Reforma Tributária</h4>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Federal (CBS)</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className={labelCls}>Alíquota CBS (%)</label><input value={form.aliquota_cbs || ""} onChange={e => updateForm(emp.id, "aliquota_cbs", e.target.value)} className={inputCls} placeholder="Ex: 8.8" /></div>
                            <div><label className={labelCls}>Status da Guia</label><select value={form.cbs_status || "pendente"} onChange={e => updateForm(emp.id, "cbs_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                            <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.cbs_data_envio || ""} onChange={e => updateForm(emp.id, "cbs_data_envio", e.target.value)} className={inputCls} /></div>
                          </div>
                        </div>
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Estadual/Municipal (IBS)</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className={labelCls}>Alíquota IBS (%)</label><input value={form.aliquota_ibs || ""} onChange={e => updateForm(emp.id, "aliquota_ibs", e.target.value)} className={inputCls} placeholder="Ex: 17.7" /></div>
                            <div><label className={labelCls}>Status da Guia</label><select value={form.ibs_status || "pendente"} onChange={e => updateForm(emp.id, "ibs_status", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                            <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.ibs_data_envio || ""} onChange={e => updateForm(emp.id, "ibs_data_envio", e.target.value)} className={inputCls} /></div>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className={labelCls}>Alíquota Geral Única (%)</label><input value={form.aliquota || ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value)} className={inputCls} placeholder="Ex: 6" /></div>
                        <div><label className={labelCls}>Status da Guia Única</label><select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                        <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className={inputCls} /></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2"><button onClick={() => handleSave(emp.id)} className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110 transition-all" style={{ background: "var(--gradient-primary)" }}><Save size={16} /> Salvar Alterações</button></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FiscalPage;
