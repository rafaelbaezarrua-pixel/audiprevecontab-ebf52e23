import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const FiscalPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("fiscal");
  const [fiscalData, setFiscalData] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach(f => { map[f.empresa_id] = f; });
      setFiscalData(map);
    };
    load();
  }, [competencia]);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = fiscalData[id] || {};
    let fixedFields = { tipo_nota: "", recebimento_arquivos: "", aliquota: "", ramo_empresarial: "" };
    if (!existing.id) {
      const { data: prev } = await supabase.from("fiscal").select("tipo_nota, recebimento_arquivos, aliquota, ramo_empresarial").eq("empresa_id", id).order("competencia", { ascending: false }).limit(1);
      if (prev?.[0]) {
        fixedFields = { tipo_nota: prev[0].tipo_nota || "", recebimento_arquivos: prev[0].recebimento_arquivos || "", aliquota: prev[0].aliquota?.toString() || "", ramo_empresarial: prev[0].ramo_empresarial || "" };
      }
    } else {
      fixedFields = { tipo_nota: existing.tipo_nota || "", recebimento_arquivos: existing.recebimento_arquivos || "", aliquota: existing.aliquota?.toString() || "", ramo_empresarial: existing.ramo_empresarial || "" };
    }
    setEditForm(prev => ({
      ...prev, [id]: {
        ...fixedFields, forma_envio: existing.forma_envio || "",
        status_guia: existing.status_guia || "pendente", data_envio: existing.data_envio || "",
        observacoes: existing.observacoes || {},
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = fiscalData[empresaId];
    try {
      const payload = {
        empresa_id: empresaId, competencia, tipo_nota: form.tipo_nota || null,
        recebimento_arquivos: form.recebimento_arquivos || null, forma_envio: form.forma_envio || null,
        aliquota: form.aliquota ? parseFloat(form.aliquota) : null,
        status_guia: form.status_guia || "pendente", data_envio: form.data_envio || null,
        observacoes: form.observacoes || {}, ramo_empresarial: form.ramo_empresarial || null,
      };
      if (existing?.id) {
        await supabase.from("fiscal").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("fiscal").insert(payload);
      }
      toast.success("Dados fiscais salvos!");
      const { data } = await supabase.from("fiscal").select("*").eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach(f => { map[f.empresa_id] = f; });
      setFiscalData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = empresas.filter(e => fiscalData[e.id]?.status_guia === "enviada" || fiscalData[e.id]?.status_guia === "gerada").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-card-foreground">Departamento Fiscal</h1><p className="text-sm text-muted-foreground mt-1">Controle mensal de impostos por empresa</p></div>
        <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Empresas</p><p className="text-2xl font-bold text-primary mt-1">{empresas.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Concluídas</p><p className="text-2xl font-bold text-success mt-1">{completedCount}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase">Pendentes</p><p className="text-2xl font-bold text-warning mt-1">{empresas.length - completedCount}</p></div>
      </div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const done = fiscalData[emp.id]?.status_guia === "enviada" || fiscalData[emp.id]?.status_guia === "gerada";
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • {regimeLabels[emp.regime_tributario] || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Tipo de Nota</label><input value={form.tipo_nota || ""} onChange={e => updateForm(emp.id, "tipo_nota", e.target.value)} className={inputCls} placeholder="NFE, NFCE, NFSE" /></div>
                    <div><label className={labelCls}>Recebimento de Arquivos</label><input value={form.recebimento_arquivos || ""} onChange={e => updateForm(emp.id, "recebimento_arquivos", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp, ISS..." /></div>
                    <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp..." /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className={labelCls}>Alíquota da Guia</label><input value={form.aliquota || ""} onChange={e => updateForm(emp.id, "aliquota", e.target.value)} className={inputCls} placeholder="Ex: 6%" /></div>
                    <div><label className={labelCls}>Ramo Empresarial</label><input value={form.ramo_empresarial || ""} onChange={e => updateForm(emp.id, "ramo_empresarial", e.target.value)} className={inputCls} placeholder="Ex: Comércio, Serviços..." /></div>
                    <div><label className={labelCls}>Status da Guia</label><select value={form.status_guia || "pendente"} onChange={e => updateForm(emp.id, "status_guia", e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select></div>
                    <div><label className={labelCls}>Data de Envio</label><input type="date" value={form.data_envio || ""} onChange={e => updateForm(emp.id, "data_envio", e.target.value)} className={inputCls} /></div>
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

export default FiscalPage;
