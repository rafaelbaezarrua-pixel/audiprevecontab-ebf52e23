import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ChevronDown, ChevronUp, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

const PessoalPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [pessoalData, setPessoalData] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      const { data: emps } = await supabase.from("empresas").select("*").neq("situacao", "baixada").order("nome_empresa");
      setEmpresas(emps || []);
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach(p => { map[p.empresa_id] = p; });
      setPessoalData(map);
    };
    load();
  }, [competencia]);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const existing = pessoalData[id] || {};
    setEditForm(prev => ({
      ...prev, [id]: {
        forma_envio: existing.forma_envio || "", qtd_funcionarios: existing.qtd_funcionarios || 0,
        qtd_pro_labore: existing.qtd_pro_labore || 0, possui_vt: existing.possui_vt || false,
        possui_va: existing.possui_va || false, possui_recibos: existing.possui_recibos || false, vt_status: existing.vt_status || "pendente",
        vt_data_envio: existing.vt_data_envio || "", va_status: existing.va_status || "pendente",
        va_data_envio: existing.va_data_envio || "", inss_status: existing.inss_status || "pendente",
        inss_data_envio: existing.inss_data_envio || "", fgts_status: existing.fgts_status || "pendente",
        fgts_data_envio: existing.fgts_data_envio || "", recibos_status: existing.recibos_status || "pendente",
        recibos_data_envio: existing.recibos_data_envio || "", dctf_web_gerada: existing.dctf_web_gerada || false,
      }
    }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = pessoalData[empresaId];
    try {
      const payload = {
        empresa_id: empresaId, competencia, forma_envio: form.forma_envio || null,
        qtd_funcionarios: parseInt(form.qtd_funcionarios) || 0, qtd_pro_labore: parseInt(form.qtd_pro_labore) || 0,
        possui_vt: form.possui_vt || false, possui_va: form.possui_va || false, possui_recibos: form.possui_recibos || false,
        vt_status: form.vt_status as any, vt_data_envio: form.vt_data_envio || null,
        va_status: form.va_status as any, va_data_envio: form.va_data_envio || null,
        inss_status: form.inss_status as any, inss_data_envio: form.inss_data_envio || null,
        fgts_status: form.fgts_status as any, fgts_data_envio: form.fgts_data_envio || null,
        recibos_status: form.recibos_status as any, recibos_data_envio: form.recibos_data_envio || null,
        dctf_web_gerada: form.dctf_web_gerada || false,
      };
      if (existing?.id) {
        await supabase.from("pessoal").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("pessoal").insert(payload);
      }
      toast.success("Dados do pessoal salvos!");
      const { data } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach(p => { map[p.empresa_id] = p; });
      setPessoalData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const updateForm = (empresaId: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [empresaId]: { ...prev[empresaId], [field]: value } }));
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = empresas.filter(e => pessoalData[e.id]?.dctf_web_gerada).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-card-foreground">Departamento Pessoal</h1><p className="text-sm text-muted-foreground mt-1">Controle mensal de folha, encargos e obrigações</p></div>
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
          const done = pessoalData[emp.id]?.dctf_web_gerada;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(emp.id)}>
                <div className="flex items-center gap-3">{done ? <CheckCircle size={18} className="text-success" /> : <Circle size={18} className="text-muted-foreground" />}<div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-2"><span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-muted/10">
                  <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Informações</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio || ""} onChange={e => updateForm(emp.id, "forma_envio", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Qtd Funcionários</label><input type="number" value={form.qtd_funcionarios || 0} onChange={e => updateForm(emp.id, "qtd_funcionarios", e.target.value)} className={inputCls} /></div>
                      <div><label className={labelCls}>Qtd Pró-labore</label><input type="number" value={form.qtd_pro_labore || 0} onChange={e => updateForm(emp.id, "qtd_pro_labore", e.target.value)} className={inputCls} /></div>
                      <div className="flex items-end gap-3"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.possui_vt || false} onChange={e => updateForm(emp.id, "possui_vt", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> VT</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.possui_va || false} onChange={e => updateForm(emp.id, "possui_va", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> VA</label><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.possui_recibos || false} onChange={e => updateForm(emp.id, "possui_recibos", e.target.checked)} className="w-4 h-4 rounded border-border text-primary" /> Recibos</label></div>
                    </div>
                  </div>
                  <div><h3 className="text-sm font-semibold text-card-foreground mb-3">Encargos - {competencia}</h3>
                    <div className="space-y-3">
                      {[...(form.possui_vt ? [{ label: "VT", statusKey: "vt_status", dateKey: "vt_data_envio" }] : []), ...(form.possui_va ? [{ label: "VA", statusKey: "va_status", dateKey: "va_data_envio" }] : []), { label: "INSS", statusKey: "inss_status", dateKey: "inss_data_envio" }, { label: "FGTS", statusKey: "fgts_status", dateKey: "fgts_data_envio" }].map(enc => (
                        <div key={enc.label} className="grid grid-cols-3 gap-3 items-center"><span className="text-sm font-medium text-card-foreground">{enc.label}</span><select value={form[enc.statusKey] || "pendente"} onChange={e => updateForm(emp.id, enc.statusKey, e.target.value)} className={inputCls}><option value="pendente">Pendente</option><option value="gerada">Gerada</option><option value="enviada">Enviada</option></select><input type="date" value={form[enc.dateKey] || ""} onChange={e => updateForm(emp.id, enc.dateKey, e.target.value)} className={inputCls} /></div>
                      ))}
                      <div className="grid grid-cols-3 gap-3 items-center"><span className="text-sm font-medium text-card-foreground">DCTF Web</span><select value={form.dctf_web_gerada ? "sim" : "nao"} onChange={e => updateForm(emp.id, "dctf_web_gerada", e.target.value === "sim")} className={inputCls}><option value="nao">Não Gerada</option><option value="sim">Gerada</option></select><div /></div>
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
