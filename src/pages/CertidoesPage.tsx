import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Building2, FileText } from "lucide-react";
import { toast } from "sonner";

const tiposCertidao = ["CND Federal", "CND Estadual", "CND Municipal", "CND FGTS", "CND Trabalhista", "CNDT", "Certidão INSS", "Certidão Tributos Federais", "Outra"];
const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const CertidoesPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [certidoes, setCertidoes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCert, setNewCert] = useState({ tipo_certidao: "CND Federal", vencimento: "", observacao: "" });

  const load = async () => {
    const { data: emps } = await supabase.from("empresas").select("id, nome_empresa, cnpj").order("nome_empresa");
    setEmpresas(emps || []);
    const { data: certs } = await supabase.from("certidoes").select("*");
    setCertidoes(certs || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const addCertidao = async (empresaId: string) => {
    if (!newCert.tipo_certidao) { toast.error("Selecione o tipo"); return; }
    const { error } = await supabase.from("certidoes").insert({ empresa_id: empresaId, tipo_certidao: newCert.tipo_certidao, vencimento: newCert.vencimento || null, observacao: newCert.observacao || null });
    if (error) toast.error(error.message);
    else { toast.success("Certidão adicionada!"); setNewCert({ tipo_certidao: "CND Federal", vencimento: "", observacao: "" }); load(); }
  };

  const removeCertidao = async (certId: string) => {
    if (!window.confirm("Excluir certidão?")) return;
    await supabase.from("certidoes").delete().eq("id", certId);
    toast.success("Certidão excluída!"); load();
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-card-foreground">Certidões Negativas</h1><p className="text-sm text-muted-foreground mt-1">Controle de certidões por empresa com vencimento</p></div>
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const empCerts = certidoes.filter(c => c.empresa_id === emp.id);
          const vencidas = empCerts.filter(c => calcDias(c.vencimento) < 0).length;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{empCerts.length} certidões</span>{vencidas > 0 && <span className="badge-status badge-danger">{vencidas} vencidas</span>}{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  {empCerts.length > 0 && <div className="space-y-2">{empCerts.map((c: any) => { const dias = calcDias(c.vencimento); const statusCls = dias < 0 ? "badge-danger" : dias <= 30 ? "badge-warning" : "badge-success"; const statusLabel = dias === 999 ? "—" : dias < 0 ? "Vencida" : dias <= 30 ? "Próxima" : "Válida"; return (<div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"><div className="flex items-center gap-3"><FileText size={16} className="text-primary" /><div><p className="text-sm font-medium text-card-foreground">{c.tipo_certidao}</p><p className="text-xs text-muted-foreground">{c.vencimento ? `Venc: ${new Date(c.vencimento).toLocaleDateString("pt-BR")}` : "Sem vencimento"}{dias !== 999 && ` (${dias}d)`}</p></div></div><div className="flex items-center gap-2"><span className={`badge-status ${statusCls}`}>{statusLabel}</span><button onClick={() => removeCertidao(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button></div></div>); })}</div>}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                    <p className="text-sm font-medium text-card-foreground">Adicionar Certidão</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div><label className={labelCls}>Tipo</label><select value={newCert.tipo_certidao} onChange={e => setNewCert({ ...newCert, tipo_certidao: e.target.value })} className={inputCls}>{tiposCertidao.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                      <div><label className={labelCls}>Data de Validade</label><input type="date" value={newCert.vencimento} onChange={e => setNewCert({ ...newCert, vencimento: e.target.value })} className={inputCls} /></div>
                      <div><label className={labelCls}>Observação</label><input value={newCert.observacao} onChange={e => setNewCert({ ...newCert, observacao: e.target.value })} className={inputCls} /></div>
                      <div className="flex items-end"><button onClick={() => addCertidao(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={14} /> Adicionar</button></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CertidoesPage;
