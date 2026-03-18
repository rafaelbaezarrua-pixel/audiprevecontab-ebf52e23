import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { PessoalRecord, GuiaStatus } from "@/types/pessoal";

const PessoalPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("pessoal");
  const [pessoalData, setPessoalData] = useState<Record<string, PessoalRecord>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
      const map: Record<string, PessoalRecord> = {};
      data?.forEach(p => { map[p.empresa_id] = p as unknown as PessoalRecord; });
      setPessoalData(map);
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
      const record = pessoalData[e.id];
      if (!record) {
        matchStatus = filterStatus === 'pendente';
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

    return matchSearch && matchTab && matchStatus;
  });

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
      if (existing?.id) {
        await supabase.from("pessoal").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("pessoal").insert(payload);
      }
      toast.success("Dados do pessoal salvos!");
      const { data } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
      const map: Record<string, PessoalRecord> = {};
      data?.forEach(p => { map[p.empresa_id] = p as unknown as PessoalRecord; });
      setPessoalData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: string | number | boolean | null) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = filtered.filter(e => pessoalData[e.id]?.dctf_web_gerada).length;

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
          const done = pessoalData[emp.id]?.dctf_web_gerada;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
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
