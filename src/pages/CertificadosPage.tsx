import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp, Save, User } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAlertasInteligentes } from "@/contexts/AlertasInteligentesProvider";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const tipoLabels: Record<string, string> = { a1: "A1 (Arquivo)", a3: "A3 (Token)", "e-cpf": "e-CPF", "e-cnpj": "e-CNPJ", nfe: "NF-e" };
const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const CertificadosPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("certificados");
  const { checkAlerts } = useAlertasInteligentes();
  const [certData, setCertData] = useState<Record<string, any>>({});
  const [sociosMap, setSociosMap] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

  useEffect(() => {
    const load = async () => {
      const { data: certs } = await supabase.from("certificados_digitais").select("*");
      const map: Record<string, any> = {};
      certs?.forEach(c => { map[c.empresa_id] = c; });
      setCertData(map);
      // Get all admin socios
      const { data: allSocios } = await supabase.from("socios").select("*").eq("administrador", true);
      const sMap: Record<string, any> = {};
      allSocios?.forEach(s => { sMap[s.empresa_id] = s; });
      setSociosMap(sMap);
    };
    load();
  }, []);

  const empresasWithCert = empresas.map(emp => {
    const cert = certData[emp.id] || {};
    const dias = calcDias(cert.data_vencimento);
    const status = dias === 999 ? "sem_dados" : dias < 0 ? "vencido" : dias <= 30 ? "proximo" : "ativo";
    const admin = sociosMap[emp.id];
    return { ...emp, cert, dias, status, adminNome: admin?.nome || "—", adminCpf: admin?.cpf || "" };
  });

  const filtered = empresasWithCert.filter(e => {
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
    ativos: filtered.filter(e => e.status === "ativo").length,
    proximos: filtered.filter(e => e.status === "proximo").length,
    vencidos: filtered.filter(e => e.status === "vencido").length,
    semDados: filtered.filter(e => e.status === "sem_dados").length
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const emp = empresasWithCert.find(e => e.id === id);
    if (emp) setEditForm(prev => ({ ...prev, [id]: { data_vencimento: emp.cert.data_vencimento || "", tipo_emissao: emp.cert.tipo_emissao || "presencial", observacao: emp.cert.observacao || "" } }));
  };

  const handleSave = async (empresaId: string) => {
    const form = editForm[empresaId];
    const existing = certData[empresaId];
    const admin = sociosMap[empresaId];
    try {
      if (existing?.id) {
        const { error } = await supabase.from("certificados_digitais").update({
          data_vencimento: form.data_vencimento || null,
          tipo_emissao: form.tipo_emissao || null,
          observacao: form.observacao || null,
          socio_responsavel_id: admin?.id || null
        }).eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("certificados_digitais").insert({
          empresa_id: empresaId,
          data_vencimento: form.data_vencimento || null,
          tipo_emissao: form.tipo_emissao || null,
          observacao: form.observacao || null,
          socio_responsavel_id: admin?.id || null
        });

        if (error) throw error;
      }
      toast.success("Certificado atualizado!");

      // Trigger instant check for alerts
      checkAlerts();

      const { data: certs } = await supabase.from("certificados_digitais").select("*");
      const map: Record<string, any> = {};
      certs?.forEach(c => { map[c.empresa_id] = c; });
      setCertData(map);
    } catch (err: any) { toast.error(err.message); }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Certificados <span className="text-primary/90">Digitais</span></h1>
             <FavoriteToggleButton moduleId="certificados" />
          </div>
          <p className="subtitle-premium">Gestão centralizada e alertas inteligentes de validade para certificados A1, A3 e e-CNPJ.</p>
        </div>
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ativos", count: counts.ativos, cls: "text-emerald-500", bg: "bg-emerald-500/10", icon: <CheckCircle size={20} /> },
          { label: "Próximos", count: counts.proximos, cls: "text-amber-500", bg: "bg-amber-500/10", icon: <Clock size={20} /> },
          { label: "Vencidos", count: counts.vencidos, cls: "text-rose-500", bg: "bg-rose-500/10", icon: <AlertTriangle size={20} /> },
          { label: "Sem Dados", count: counts.semDados, cls: "text-slate-400", bg: "bg-slate-400/10", icon: <AlertTriangle size={20} /> }
        ].map(s => (
          <div key={s.label} className="card-premium !p-6 flex items-center justify-between group hover:scale-[1.02] transition-all duration-300 border-none shadow-lg shadow-black/5">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.label}</p>
              <p className={`text-3xl font-black ${s.cls} tracking-tight`}>{s.count}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 shadow-inner group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between bg-muted/30 p-6 rounded-3xl border border-border/60">
          <div className="relative w-full lg:max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar empresa ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-card border border-border/40 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm placeholder:font-normal placeholder:tracking-normal"
            />
          </div>
          
          <div className="flex bg-card p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full lg:w-auto shadow-sm">
            {[
              { key: "todos", label: "Todos" },
              { key: "ativo", label: "Ativos" },
              { key: "proximo", label: "Próximos" },
              { key: "vencido", label: "Vencidos" },
              { key: "sem_dados", label: "Sem Dados" }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === f.key ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-primary hover:bg-primary/5"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex bg-muted/20 p-1.5 rounded-2xl border border-border/40 overflow-x-auto no-scrollbar w-full">
            {[
                { id: "ativas", label: "Empresas Ativas" },
                { id: "mei", label: "Empresas MEI" },
                { id: "paralisadas", label: "Paralisadas" },
                { id: "baixadas", label: "Baixadas" },
                { id: "entregue", label: "Entregues" }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const form = editForm[emp.id] || {};
          const isVencido = emp.status === "vencido";
          const isProximo = emp.status === "proximo";
          const isAtivo = emp.status === "ativo";
          
          return (
            <div key={emp.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-lg' : 'border-border/60 hover:border-primary/20'} rounded-3xl transition-all duration-300 overflow-hidden`}>
              <div 
                className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                onClick={() => toggleExpand(emp.id)}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-primary/10 text-primary'}`}>
                    <User size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-sm uppercase tracking-tight text-card-foreground line-clamp-1">{emp.nome_empresa}</p>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.cnpj || "NÃO INFORMADO"}</p>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <p className="text-[10px] font-black text-primary/80 uppercase tracking-tighter">RESP: {emp.adminNome}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isVencido ? 'bg-destructive/10 text-destructive' : isProximo ? 'bg-warning/10 text-warning' : isAtivo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                    {isVencido ? "Vencido" : isProximo ? "Próximo" : isAtivo ? "Ativo" : "Pendente"}
                  </span>
                  <div className={`p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-all ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border/40 p-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Validade</label>
                        <input 
                            type="date" 
                            value={form.data_vencimento || ""} 
                            onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], data_vencimento: e.target.value } }))} 
                            className="w-full h-14 px-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" 
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Modalidade de Emissão</label>
                        <select 
                            value={form.tipo_emissao || "presencial"} 
                            onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], tipo_emissao: e.target.value } }))} 
                            className="w-full h-14 px-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all appearance-none"
                        >
                            <option value="presencial">Presencial</option>
                            <option value="videoconferencia">Videoconferência</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável Associado</label>
                        <div className="w-full h-14 px-5 bg-muted/10 border border-border/40 rounded-2xl text-xs font-bold flex items-center text-muted-foreground/60">
                           {emp.adminNome}
                        </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações do Certificado</label>
                    <textarea 
                        value={form.observacao || ""} 
                        onChange={e => setEditForm(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], observacao: e.target.value } }))} 
                        placeholder="Informações adicionais sobre o certificado, token ou senha de acesso..."
                        className="w-full min-h-[100px] p-5 bg-muted/30 border border-border/60 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4 border-t border-border/40">
                      <button 
                        onClick={() => handleSave(emp.id)} 
                        className="px-12 h-14 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                      >
                        <Save size={18} /> ATUALIZAR DADOS
                      </button>
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

export default CertificadosPage;
