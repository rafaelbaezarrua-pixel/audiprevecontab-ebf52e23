import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { ProcuracaoRecord } from "@/types/administrative";

const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const ProcuracoesPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("procuracoes");
  const [procData, setProcData] = useState<Record<string, ProcuracaoRecord>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, Partial<ProcuracaoRecord>>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

  useEffect(() => {
    const load = async () => {
      const { data: procs } = await supabase.from("procuracoes").select("*");
      const map: Record<string, ProcuracaoRecord> = {};
      (procs as unknown as ProcuracaoRecord[])?.forEach(p => { map[p.empresa_id] = p; });
      setProcData(map);
    };
    load();
  }, []);

  const empresasWithProc = empresas.map(emp => {
    const proc = procData[emp.id] || {};
    const dias = calcDias(proc.data_vencimento);
    const status = dias === 999 ? "sem_dados" : dias < 0 ? "vencida" : dias <= 30 ? "proxima" : "ativa";
    return { ...emp, proc, dias, status };
  });

  const filtered = empresasWithProc.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const matchStatus = filterStatus === "todos" || e.status === filterStatus;

    let matchTab = false;
    if (activeTab === "ativas") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
    } else if (activeTab === "mei") {
      matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
    } else if (activeTab === "paralisadas") {
      matchTab = e.situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = e.situacao === "baixada";
    } else if (activeTab === "entregue") {
      matchTab = e.situacao === "entregue";
    }

    return matchSearch && matchStatus && matchTab;
  });

  const counts = {
    ativas: filtered.filter(e => e.status === "ativa").length,
    proximas: filtered.filter(e => e.status === "proxima").length,
    vencidas: filtered.filter(e => e.status === "vencida").length,
    semDados: filtered.filter(e => e.status === "sem_dados").length
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresasWithProc.find(e => e.id === id);
    if (emp) setEditForm(prev => ({ ...prev, [id]: { data_cadastro: emp.proc.data_cadastro || "", data_vencimento: emp.proc.data_vencimento || "", observacao: emp.proc.observacao || "" } }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = procData[empresaId];
    try {
      if (existing?.id) {
        await supabase.from("procuracoes").update({ data_cadastro: form.data_cadastro || null, data_vencimento: form.data_vencimento || null, observacao: form.observacao || null }).eq("id", existing.id);
      } else {
        await supabase.from("procuracoes").insert({ empresa_id: empresaId, data_cadastro: form.data_cadastro || null, data_vencimento: form.data_vencimento || null, observacao: form.observacao || null });
      }
      toast.success("Procuração atualizada!");
      // Reload
      const { data: procs } = await supabase.from("procuracoes").select("*");
      const map: Record<string, ProcuracaoRecord> = {};
      (procs as unknown as ProcuracaoRecord[])?.forEach(p => { map[p.empresa_id] = p; });
      setProcData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Ativas", count: counts.ativas, cls: "text-success", bg: "bg-success/10", icon: <CheckCircle size={20} /> }, { label: "Próximas", count: counts.proximas, cls: "text-warning", bg: "bg-warning/10", icon: <Clock size={20} /> }, { label: "Vencidas", count: counts.vencidas, cls: "text-destructive", bg: "bg-destructive/10", icon: <AlertTriangle size={20} /> }, { label: "Sem Dados", count: counts.semDados, cls: "text-muted-foreground", bg: "bg-muted", icon: <AlertTriangle size={20} /> }].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.count}</p></div><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cls}`}>{s.icon}</div></div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
        <div className="flex gap-2 flex-wrap">{[{ key: "todos", label: "Todos" }, { key: "ativa", label: "Ativas" }, { key: "proxima", label: "Próximas" }, { key: "vencida", label: "Vencidas" }, { key: "sem_dados", label: "Sem Dados" }].map(f => (<button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.label}</button>))}</div>
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
          const statusCls = emp.status === "vencida" ? "badge-danger" : emp.status === "proxima" ? "badge-warning" : emp.status === "ativa" ? "badge-success" : "badge-gray";
          const statusLabel = emp.status === "vencida" ? "Vencida" : emp.status === "proxima" ? "Próxima" : emp.status === "ativa" ? "Ativa" : "Sem dados";
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-3">{emp.proc.data_vencimento && <span className="text-xs text-muted-foreground">Venc: {new Date(emp.proc.data_vencimento).toLocaleDateString("pt-BR")}</span>}<span className={`badge-status ${statusCls}`}>{statusLabel}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Data de Cadastro</label><input type="date" value={form.data_cadastro || ""} onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_cadastro: e.target.value } }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Data de Validade</label><input type="date" value={form.data_vencimento || ""} onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_vencimento: e.target.value } }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Observação</label><input value={form.observacao || ""} onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], observacao: e.target.value } }))} className={inputCls} /></div>
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

export default ProcuracoesPage;
