import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Building2, ChevronDown, ChevronUp,
  Shield, CheckCircle, Clock, AlertTriangle, Save
} from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";

const licencaLabels: Record<string, string> = {
  alvara: "Alvará de Funcionamento",
  vigilancia_sanitaria: "Vigilância Sanitária",
  corpo_bombeiros: "Corpo de Bombeiros",
  meio_ambiente: "Meio Ambiente"
};

const tipoStatusLabels: Record<string, { label: string; cls: string }> = {
  definitiva: { label: "Definitiva", cls: "badge-success" },
  dispensada: { label: "Dispensada", cls: "badge-gray" },
  com_vencimento: { label: "Com Vencimento", cls: "badge-warning" },
  em_processo: { label: "Em Processo", cls: "badge-info" },
};

const calcDias = (data?: string | null) => {
  if (!data) return 999;
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
};

type TabType = "licencas" | "taxas";

const LicencasPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("licencas");
  const [licencas, setLicencas] = useState<any[]>([]);
  const [taxas, setTaxas] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("licencas");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [taxasForm, setTaxasForm] = useState<Record<string, Record<string, any>>>({});

  const loadBaseData = async () => {
    const { data: lics } = await supabase.from("licencas").select("*");
    setLicencas(lics || []);
  };

  const loadTaxas = async () => {
    const { data } = await supabase.from("licencas_taxas").select("*").eq("competencia", competencia);
    setTaxas(data || []);

    // Auto-populate edit form with fetched data
    const map: Record<string, Record<string, any>> = {};
    data?.forEach(t => {
      if (!map[t.empresa_id]) map[t.empresa_id] = {};
      map[t.empresa_id][t.tipo_licenca] = {
        id: t.id,
        status: t.status,
        data_envio: t.data_envio,
        forma_envio: t.forma_envio
      };
    });
    setTaxasForm(map);
  };

  useEffect(() => { loadBaseData(); }, []);
  useEffect(() => { if (activeTab === "taxas") loadTaxas(); }, [competencia, activeTab]);

  const licByEmpresa = (empId: string) => licencas.filter(l => l.empresa_id === empId);

  // Filters for Licencas Tab
  const filteredLicencas = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    if (filterStatus === "todos") return matchSearch;
    return matchSearch && licByEmpresa(e.id).some((l: any) => l.status === filterStatus);
  });

  // Filters for Taxas Tab (Shows only companies that have at least one valid license)
  const filteredTaxas = empresas.filter(e => {
    const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);
    const hasAnyLicence = licByEmpresa(e.id).length > 0;
    return matchSearch && hasAnyLicence;
  });

  const counts = {
    definitiva: licencas.filter(l => l.status === "definitiva").length,
    dispensada: licencas.filter(l => l.status === "dispensada").length,
    com_vencimento: licencas.filter(l => l.status === "com_vencimento").length,
    em_processo: licencas.filter(l => l.status === "em_processo").length
  };

  // --- Handlers for Taxas Tab ---
  const handleTaxaChange = (empresaId: string, tipoLicenca: string, field: string, value: any) => {
    setTaxasForm(prev => {
      const empData = prev[empresaId] || {};
      const licData = empData[tipoLicenca] || { status: 'pendente', data_envio: '', forma_envio: '' };
      return {
        ...prev,
        [empresaId]: {
          ...empData,
          [tipoLicenca]: { ...licData, [field]: value }
        }
      }
    });
  };

  const saveTaxas = async (empresaId: string) => {
    const empTaxas = taxasForm[empresaId];
    if (!empTaxas) return;

    try {
      const promises = Object.keys(licencaLabels).map(async (tipoLicenca) => {
        const data = empTaxas[tipoLicenca];
        if (!data) return; // Only save those modified/existing in form state

        const payload = {
          empresa_id: empresaId,
          tipo_licenca: tipoLicenca,
          competencia,
          status: data.status || 'pendente',
          data_envio: data.data_envio || null,
          forma_envio: data.forma_envio || null
        };

        if (data.id) {
          return supabase.from("licencas_taxas").update(payload).eq("id", data.id);
        } else {
          return supabase.from("licencas_taxas").insert(payload);
        }
      });

      await Promise.all(promises);
      toast.success("Taxas atualizadas com sucesso!");
      loadTaxas(); // Reload to get newly inserted IDs
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar as taxas.");
    }
  };

  const inputCls = "w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-1 focus:ring-primary outline-none";
  const labelCls = "block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Controle de Licenças Municipais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os status e as taxas acompanhando as companhias.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveTab("licencas"); setExpanded(null); }}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === "licencas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Status das Licenças
        </button>
        <button
          onClick={() => { setActiveTab("taxas"); setExpanded(null); }}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === "taxas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Taxas das Licenças
        </button>
      </div>

      {activeTab === "licencas" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[{ label: "Definitivas", count: counts.definitiva, cls: "text-success", bg: "bg-success/10", icon: <CheckCircle size={20} /> }, { label: "Com Vencimento", count: counts.com_vencimento, cls: "text-warning", bg: "bg-warning/10", icon: <Clock size={20} /> }, { label: "Em Processo", count: counts.em_processo, cls: "text-primary", bg: "bg-primary/10", icon: <Shield size={20} /> }, { label: "Dispensadas", count: counts.dispensada, cls: "text-muted-foreground", bg: "bg-muted", icon: <AlertTriangle size={20} /> }].map(s => (
              <div key={s.label} className="stat-card flex items-center justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p><p className={`text-2xl font-bold mt-1 ${s.cls}`}>{s.count}</p></div><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.cls}`}>{s.icon}</div></div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
            <div className="flex gap-2 flex-wrap">
              {[{ key: "todos", label: "Todos" }, { key: "definitiva", label: "Definitivas" }, { key: "com_vencimento", label: "Com Vencimento" }, { key: "em_processo", label: "Em Processo" }, { key: "dispensada", label: "Dispensadas" }].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filteredLicencas.length === 0 ? <div className="module-card text-center py-12 text-muted-foreground">Nenhuma empresa encontrada</div> : filteredLicencas.map(emp => {
              const isOpen = expanded === emp.id;
              const empLicencas = licByEmpresa(emp.id);
              return (
                <div key={emp.id} className="module-card !p-0 overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
                    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                    <div className="flex items-center gap-2">{empLicencas.map((l: any, i: number) => { const cfg = tipoStatusLabels[l.status] || { label: "—", cls: "badge-gray" }; return <span key={i} className={`badge-status ${cfg.cls} text-[10px]`}>{cfg.label}</span>; })}{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-border p-5 bg-muted/10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(licencaLabels).map(([key, label]) => {
                          const lic = empLicencas.find((l: any) => l.tipo_licenca === key);
                          const cfg = lic ? tipoStatusLabels[lic.status] || { label: "Não definido", cls: "badge-gray" } : { label: "Não definido", cls: "badge-gray" };
                          const dias = lic?.status === "com_vencimento" ? calcDias(lic.vencimento) : null;
                          return (
                            <div key={key} className="p-4 rounded-xl border border-border bg-card">
                              <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-card-foreground">{label}</h4><span className={`badge-status ${cfg.cls}`}>{cfg.label}</span></div>
                              {lic?.status === "com_vencimento" && lic.vencimento && <div className="text-xs text-muted-foreground">Vencimento: {new Date(lic.vencimento).toLocaleDateString("pt-BR")}{dias !== null && <span className={`ml-2 font-medium ${dias < 0 ? "text-destructive" : dias <= 30 ? "text-warning" : "text-success"}`}>({dias}d)</span>}</div>}
                              {lic?.status === "em_processo" && lic.numero_processo && <div className="text-xs text-muted-foreground">Processo: {lic.numero_processo}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "taxas" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Competência:</span>
              <input type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} className="px-4 py-2 border border-border rounded-lg bg-background text-foreground font-semibold text-sm outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-3">
            {filteredTaxas.length === 0 ? <div className="module-card text-center py-12 text-muted-foreground">Nenhuma empresa com licenças encontradas</div> : filteredTaxas.map(emp => {
              const isOpen = expanded === emp.id;
              const empLicencas = licByEmpresa(emp.id);
              return (
                <div key={emp.id} className="module-card !p-0 overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div>
                      <div>
                        <p className="font-semibold text-card-foreground">{emp.nome_empresa}</p>
                        <p className="text-xs text-muted-foreground">{emp.cnpj || "—"} • {empLicencas.length} Licença(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border p-5 bg-muted/10 space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(licencaLabels).map(([key, label]) => {
                          const lic = empLicencas.find((l: any) => l.tipo_licenca === key);
                          if (!lic) return null; // Only show taxes blocks for licenses they actually have

                          const taxaData = (taxasForm[emp.id] && taxasForm[emp.id][key]) || { status: 'pendente', data_envio: '', forma_envio: '' };

                          return (
                            <div key={key} className="p-4 rounded-xl border border-border bg-card flex flex-col gap-3">
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <Shield size={14} /> {label}
                              </h4>

                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className={labelCls}>Status Atual</label>
                                  <select
                                    className={inputCls}
                                    value={taxaData.status}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'status', e.target.value)}
                                  >
                                    <option value="pendente">Pendente</option>
                                    <option value="gerada">Gerada</option>
                                    <option value="enviada">Enviada</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={labelCls}>Data do Envio</label>
                                  <input
                                    type="date"
                                    className={inputCls}
                                    value={taxaData.data_envio || ''}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'data_envio', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className={labelCls}>Forma de Envio</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: WhatsApp"
                                    className={inputCls}
                                    value={taxaData.forma_envio || ''}
                                    onChange={(e) => handleTaxaChange(emp.id, key, 'forma_envio', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-2 border-t border-border/50">
                        <button
                          onClick={() => saveTaxas(emp.id)}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          <Save size={16} /> Salvar Taxas deste Mês
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LicencasPage;
