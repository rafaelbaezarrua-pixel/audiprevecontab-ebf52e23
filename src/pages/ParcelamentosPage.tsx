import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";

const tiposParcelamento = ["Previdenciário", "Simples Nacional", "MEI", "IRPF", "Dívida Ativa", "ICMS", "Outros"];

const calcPrevisao = (dataInicio: string, qtd: number) => {
  if (!dataInicio || !qtd) return "";
  const d = new Date(dataInicio); d.setMonth(d.getMonth() + qtd);
  return d.toISOString().slice(0, 10);
};

const ParcelamentosPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ tipo_pessoa: "empresa", nome_pessoa_fisica: "", cpf_pessoa_fisica: "", tipo_parcelamento: "Simples Nacional", data_inicio: "", qtd_parcelas: "", forma_envio: "", data_envio: "" });

  const load = async () => { const { data } = await supabase.from("parcelamentos").select("*").order("created_at", { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(p => p.nome_pessoa_fisica?.toLowerCase().includes(search.toLowerCase()) || p.cpf_pessoa_fisica?.includes(search));

  const openNew = () => { setEditing(null); setForm({ tipo_pessoa: "empresa", nome_pessoa_fisica: "", cpf_pessoa_fisica: "", tipo_parcelamento: "Simples Nacional", data_inicio: "", qtd_parcelas: "", forma_envio: "", data_envio: "" }); setShowForm(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ tipo_pessoa: p.tipo_pessoa || "empresa", nome_pessoa_fisica: p.nome_pessoa_fisica || "", cpf_pessoa_fisica: p.cpf_pessoa_fisica || "", tipo_parcelamento: p.tipo_parcelamento || "", data_inicio: p.data_inicio || "", qtd_parcelas: String(p.qtd_parcelas || ""), forma_envio: p.forma_envio || "", data_envio: p.data_envio || "" }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome_pessoa_fisica.trim()) { toast.error("Nome obrigatório"); return; }
    const qtd = parseInt(form.qtd_parcelas) || 0;
    const payload = { tipo_pessoa: form.tipo_pessoa, nome_pessoa_fisica: form.nome_pessoa_fisica, cpf_pessoa_fisica: form.cpf_pessoa_fisica || null, tipo_parcelamento: form.tipo_parcelamento, data_inicio: form.data_inicio || null, qtd_parcelas: qtd, previsao_termino: calcPrevisao(form.data_inicio, qtd) || null, forma_envio: form.forma_envio || null, data_envio: form.data_envio || null };
    try {
      if (editing) { await supabase.from("parcelamentos").update(payload).eq("id", editing.id); toast.success("Atualizado!"); }
      else { await supabase.from("parcelamentos").insert(payload); toast.success("Cadastrado!"); }
      setShowForm(false); load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => { if (!window.confirm("Excluir parcelamento?")) return; await supabase.from("parcelamentos").delete().eq("id", id); toast.success("Excluído!"); load(); };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-card-foreground">Parcelamentos</h1><p className="text-sm text-muted-foreground mt-1">Controle de parcelamentos (Empresa e Pessoa Física)</p></div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={18} /> Novo Parcelamento</button>
      </div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
      <div className="module-card overflow-x-auto p-0">
        <table className="data-table">
          <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>Tipo</th><th>Parcelas</th><th>Previsão Fim</th><th className="text-right">Ações</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum parcelamento</td></tr> : filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium text-card-foreground">{p.nome_pessoa_fisica}</td>
                <td className="text-muted-foreground font-mono text-xs">{p.cpf_pessoa_fisica || "—"}</td>
                <td><span className="badge-status badge-info">{p.tipo_parcelamento}</span></td>
                <td className="text-muted-foreground">{p.qtd_parcelas || 0}</td>
                <td className="text-muted-foreground">{p.previsao_termino ? new Date(p.previsao_termino).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"><Edit2 size={15} /></button><button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={15} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border"><h3 className="text-lg font-bold text-card-foreground">{editing ? "Editar" : "Novo"} Parcelamento</h3><button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Tipo</label><select value={form.tipo_pessoa} onChange={e => setForm({ ...form, tipo_pessoa: e.target.value })} className={inputCls}><option value="empresa">Empresa (PJ)</option><option value="pessoa_fisica">Pessoa Física (PF)</option></select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-card-foreground mb-1">Nome</label><input value={form.nome_pessoa_fisica} onChange={e => setForm({ ...form, nome_pessoa_fisica: e.target.value })} className={inputCls} /></div><div><label className="block text-sm font-medium text-card-foreground mb-1">{form.tipo_pessoa === "empresa" ? "CNPJ" : "CPF"}</label><input value={form.cpf_pessoa_fisica} onChange={e => setForm({ ...form, cpf_pessoa_fisica: e.target.value })} className={inputCls} /></div></div>
              <div><label className="block text-sm font-medium text-card-foreground mb-1">Tipo de Parcelamento</label><select value={form.tipo_parcelamento} onChange={e => setForm({ ...form, tipo_parcelamento: e.target.value })} className={inputCls}>{tiposParcelamento.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-card-foreground mb-1">Data Início</label><input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} className={inputCls} /></div><div><label className="block text-sm font-medium text-card-foreground mb-1">Qtd Parcelas</label><input type="number" value={form.qtd_parcelas} onChange={e => setForm({ ...form, qtd_parcelas: e.target.value })} className={inputCls} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-card-foreground mb-1">Forma de Envio</label><input value={form.forma_envio} onChange={e => setForm({ ...form, forma_envio: e.target.value })} className={inputCls} /></div><div><label className="block text-sm font-medium text-card-foreground mb-1">Data de Envio</label><input type="date" value={form.data_envio} onChange={e => setForm({ ...form, data_envio: e.target.value })} className={inputCls} /></div></div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-muted">Cancelar</button><button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-primary-foreground rounded-lg shadow-md" style={{ background: "var(--gradient-primary)" }}>Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParcelamentosPage;
