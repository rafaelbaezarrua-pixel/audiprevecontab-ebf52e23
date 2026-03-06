import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Building2, MapPin, Users, ScrollText, Plus, Trash2, Crown, Calendar as CalendarIcon, FileText, Settings } from "lucide-react";

interface Socio { id?: string; nome: string; cpf: string; administrador: boolean; }
interface LicencaRow { id?: string; tipo_licenca: string; status: string | null; vencimento: string | null; numero_processo: string | null; }
interface Endereco { logradouro: string; numero: string; bairro: string; cidade: string; estado: string; cep: string; }

const emptyEndereco: Endereco = { logradouro: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" };

const tabs = [
  { id: "dados", label: "Dados Gerais", icon: <Building2 size={16} /> },
  { id: "endereco", label: "Endereço", icon: <MapPin size={16} /> },
  { id: "socios", label: "Sócios", icon: <Users size={16} /> },
  { id: "licencas", label: "Licenças Municipais", icon: <ScrollText size={16} /> },
  { id: "configuracoes", label: "Configurações", icon: <Settings size={16} /> },
];

const licencaLabels: Record<string, string> = { alvara: "Alvará de Funcionamento", vigilancia_sanitaria: "Vigilância Sanitária", corpo_bombeiros: "Corpo de Bombeiros", meio_ambiente: "Meio Ambiente" };
const licencaTipoLabels: Record<string, string> = { definitiva: "Definitiva", dispensada: "Dispensada", com_vencimento: "Com Vencimento", em_processo: "Em Processo" };
const estados = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const AVAILABLE_MODULES = [
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'licencas', label: 'Licenças' },
  { id: 'certificados', label: 'Certificados Digitais' },
  { id: 'certidoes', label: 'Certidões Negativas' },
  { id: 'procuracoes', label: 'Procurações' },
  { id: 'vencimentos', label: 'Vencimentos' },
  { id: 'parcelamentos', label: 'Parcelamentos' },
  { id: 'recalculos', label: 'Recálculos' },
  { id: 'honorarios', label: 'Honorários' },
  { id: 'declaracoes_anuais', label: 'Declarações Anuais' },
];

const SocietarioEmpresaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "nova";
  const [activeTab, setActiveTab] = useState("dados");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [dataAbertura, setDataAbertura] = useState("");
  const [porteEmpresa, setPorteEmpresa] = useState("");
  const [regimeTributario, setRegimeTributario] = useState("simples");
  const [naturezaJuridica, setNaturezaJuridica] = useState("");
  const [situacao, setSituacao] = useState("ativa");
  const [endereco, setEndereco] = useState<Endereco>({ ...emptyEndereco });
  const [socios, setSocios] = useState<Socio[]>([]);
  const [licencas, setLicencas] = useState<LicencaRow[]>([]);
  const [newSocio, setNewSocio] = useState<Socio>({ nome: "", cpf: "", administrador: false });

  // Config params
  const [modulosAtivos, setModulosAtivos] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userAcessos, setUserAcessos] = useState<Record<string, string[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("ativo", true);
      if (data) setProfiles(data);
    };
    fetchProfiles();

    if (isNew) {
      // Initialize default licencas
      setLicencas(Object.keys(licencaLabels).map(tipo => ({ tipo_licenca: tipo, status: null, vencimento: null, numero_processo: null })));
      return;
    }
    const load = async () => {
      const { data: emp } = await supabase.from("empresas").select("*").eq("id", id).single();
      if (emp) {
        setNomeEmpresa(emp.nome_empresa);
        setCnpj(emp.cnpj || "");
        setDataAbertura(emp.data_abertura || "");
        setPorteEmpresa(emp.porte_empresa || "");
        setRegimeTributario(emp.regime_tributario || "simples");
        setNaturezaJuridica(emp.natureza_juridica || "");
        setSituacao(emp.situacao || "ativa");
        const addr = (emp.endereco as any) || {};
        setEndereco({ ...emptyEndereco, ...addr });
        setModulosAtivos(emp.modulos_ativos || AVAILABLE_MODULES.map(m => m.id));
      }

      // Load acessos
      const { data: acessos } = await supabase.from("empresa_acessos").select("*").eq("empresa_id", id);
      const acessosMap: Record<string, string[]> = {};
      if (acessos) {
        acessos.forEach(a => { acessosMap[a.user_id] = a.modulos_permitidos; });
      }
      setUserAcessos(acessosMap);

      const { data: sociosData } = await supabase.from("socios").select("*").eq("empresa_id", id);
      setSocios((sociosData || []).map(s => ({ id: s.id, nome: s.nome, cpf: s.cpf || "", administrador: s.administrador || false })));

      const { data: licData } = await supabase.from("licencas").select("*").eq("empresa_id", id);
      const existingTypes = new Set((licData || []).map(l => l.tipo_licenca));
      const allLicencas = [
        ...(licData || []).map(l => ({ id: l.id, tipo_licenca: l.tipo_licenca, status: l.status, vencimento: l.vencimento, numero_processo: l.numero_processo })),
        ...Object.keys(licencaLabels).filter(t => !existingTypes.has(t)).map(t => ({ tipo_licenca: t, status: null, vencimento: null, numero_processo: null })),
      ];
      setLicencas(allLicencas);
      setLoading(false);
    };
    load();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!nomeEmpresa.trim()) { toast.error("Nome da empresa é obrigatório"); return; }
    setSaving(true);
    try {
      const empresaData = {
        nome_empresa: nomeEmpresa, cnpj: cnpj || null,
        data_abertura: dataAbertura || null, porte_empresa: porteEmpresa || null,
        regime_tributario: regimeTributario as any, natureza_juridica: naturezaJuridica || null,
        situacao: situacao as any, endereco: endereco as any,
        modulos_ativos: modulosAtivos
      };

      let empresaId = id;
      if (isNew) {
        const { data, error } = await supabase.from("empresas").insert(empresaData).select("id").single();
        if (error) throw error;
        empresaId = data.id;
      } else {
        const { error } = await supabase.from("empresas").update(empresaData).eq("id", id);
        if (error) throw error;
      }

      // Save socios - delete all and re-insert
      if (!isNew) {
        await supabase.from("socios").delete().eq("empresa_id", empresaId!);
      }
      if (socios.length > 0) {
        const { error: socError } = await supabase.from("socios").insert(
          socios.map(s => ({ empresa_id: empresaId!, nome: s.nome, cpf: s.cpf || null, administrador: s.administrador }))
        );
        if (socError) throw socError;
      }

      // Save licencas - delete all and re-insert
      if (!isNew) {
        await supabase.from("licencas").delete().eq("empresa_id", empresaId!);
      }
      const licToInsert = licencas.filter(l => l.status);
      if (licToInsert.length > 0) {
        const { error: licError } = await supabase.from("licencas").insert(
          licToInsert.map(l => ({
            empresa_id: empresaId!, tipo_licenca: l.tipo_licenca,
            status: l.status as any, vencimento: l.vencimento || null, numero_processo: l.numero_processo || null,
          }))
        );
        if (licError) throw licError;
      }

      // Save user acessos
      if (!isNew && empresaId) {
        await supabase.from("empresa_acessos").delete().eq("empresa_id", empresaId);
      }
      const acessosToInsert = Object.entries(userAcessos).map(([uid, mods]) => ({
        empresa_id: empresaId!, user_id: uid, modulos_permitidos: mods
      }));

      if (acessosToInsert.length > 0) {
        const { error: accError } = await supabase.from("empresa_acessos").insert(acessosToInsert);
        if (accError) throw accError;
      }

      toast.success(isNew ? "Empresa cadastrada com sucesso!" : "Empresa atualizada com sucesso!");
      if (isNew) navigate(`/societario/${empresaId}`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const addSocio = () => {
    if (!newSocio.nome.trim()) { toast.error("Nome do sócio é obrigatório"); return; }
    setSocios(prev => [...prev, { ...newSocio }]);
    setNewSocio({ nome: "", cpf: "", administrador: false });
    toast.success("Sócio adicionado!");
  };

  const removeSocio = (index: number) => {
    setSocios(prev => prev.filter((_, i) => i !== index));
    toast.success("Sócio removido!");
  };

  const toggleAdmin = (index: number) => {
    setSocios(prev => prev.map((s, i) => i === index ? { ...s, administrador: !s.administrador } : s));
  };

  const updateLicenca = (tipo: string, field: string, value: string) => {
    setLicencas(prev => prev.map(l => l.tipo_licenca === tipo ? { ...l, [field]: value } : l));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-colors";
  const labelCls = "block text-sm font-medium text-card-foreground mb-1.5";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/societario")} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={20} /></button>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-all disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>
          <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <div className="module-card">
        {activeTab === "dados" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Building2 size={20} className="text-primary" /> Dados Gerais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className={labelCls}>Nome da Empresa *</label><input value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} className={inputCls} placeholder="Razão Social" /></div>
              <div><label className={labelCls}>CNPJ</label><input value={cnpj} onChange={e => setCnpj(e.target.value)} className={inputCls} placeholder="00.000.000/0000-00" /></div>
              <div><label className={labelCls}>Data de Abertura</label><input type="date" value={dataAbertura} onChange={e => setDataAbertura(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Porte da Empresa</label><select value={porteEmpresa} onChange={e => setPorteEmpresa(e.target.value)} className={inputCls}><option value="">Selecione</option><option value="mei">MEI</option><option value="me">Microempresa (ME)</option><option value="epp">Empresa de Pequeno Porte (EPP)</option><option value="medio">Médio Porte</option><option value="grande">Grande Porte</option></select></div>
              <div><label className={labelCls}>Regime Tributário</label><select value={regimeTributario} onChange={e => setRegimeTributario(e.target.value)} className={inputCls}><option value="simples">Simples Nacional</option><option value="lucro_presumido">Lucro Presumido</option><option value="lucro_real">Lucro Real</option><option value="mei">MEI</option></select></div>
              <div><label className={labelCls}>Natureza Jurídica</label><select value={naturezaJuridica} onChange={e => setNaturezaJuridica(e.target.value)} className={inputCls}><option value="">Selecione</option><option value="ei">Empresário Individual (EI)</option><option value="eireli">EIRELI</option><option value="ltda">Sociedade Limitada (LTDA)</option><option value="slu">Sociedade Limitada Unipessoal (SLU)</option><option value="sa">Sociedade Anônima (S.A.)</option><option value="ss">Sociedade Simples</option><option value="mei">MEI</option></select></div>
              <div><label className={labelCls}>Situação</label><select value={situacao} onChange={e => setSituacao(e.target.value)} className={inputCls}><option value="ativa">Ativa</option><option value="paralisada">Paralisada</option><option value="baixada">Baixada</option></select></div>
            </div>
          </div>
        )}

        {activeTab === "endereco" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><MapPin size={20} className="text-primary" /> Endereço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className={labelCls}>Logradouro</label><input value={endereco.logradouro} onChange={e => setEndereco({ ...endereco, logradouro: e.target.value })} className={inputCls} placeholder="Rua, Avenida..." /></div>
              <div><label className={labelCls}>Número</label><input value={endereco.numero} onChange={e => setEndereco({ ...endereco, numero: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Bairro</label><input value={endereco.bairro} onChange={e => setEndereco({ ...endereco, bairro: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Cidade</label><input value={endereco.cidade} onChange={e => setEndereco({ ...endereco, cidade: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Estado</label><select value={endereco.estado} onChange={e => setEndereco({ ...endereco, estado: e.target.value })} className={inputCls}><option value="">Selecione</option>{estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}</select></div>
              <div><label className={labelCls}>CEP</label><input value={endereco.cep} onChange={e => setEndereco({ ...endereco, cep: e.target.value })} className={inputCls} placeholder="00000-000" /></div>
            </div>
          </div>
        )}

        {activeTab === "socios" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Users size={20} className="text-primary" /> Quadro Societário</h2>
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
              <p className="text-sm font-medium text-card-foreground">Adicionar Sócio</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div><label className={labelCls}>Nome Completo *</label><input value={newSocio.nome} onChange={e => setNewSocio({ ...newSocio, nome: e.target.value })} className={inputCls} placeholder="Nome do sócio" /></div>
                <div><label className={labelCls}>CPF</label><input value={newSocio.cpf} onChange={e => setNewSocio({ ...newSocio, cpf: e.target.value })} className={inputCls} placeholder="000.000.000-00" /></div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newSocio.administrador} onChange={e => setNewSocio({ ...newSocio, administrador: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" /> Administrador</label>
                  <button onClick={addSocio} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}><Plus size={14} /> Adicionar</button>
                </div>
              </div>
            </div>
            {socios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><Users size={40} className="mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhum sócio cadastrado</p></div>
            ) : (
              <div className="space-y-3">
                {socios.map((socio, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${socio.administrador ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {socio.administrador ? <Crown size={18} /> : <Users size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{socio.nome}</p>
                        <p className="text-xs text-muted-foreground">CPF: {socio.cpf || "—"} {socio.administrador && <span className="ml-2 badge-status badge-warning text-[10px]">Administrador</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAdmin(idx)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-warning" title="Alternar administrador"><Crown size={15} /></button>
                      <button onClick={() => removeSocio(idx)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Remover"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "licencas" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><ScrollText size={20} className="text-primary" /> Licenças Municipais</h2>
            <div className="space-y-4">
              {licencas.map((licenca) => (
                <div key={licenca.tipo_licenca} className="p-5 bg-muted/30 rounded-xl border border-border space-y-4">
                  <div className="flex items-center gap-2"><FileText size={16} className="text-primary" /><h3 className="font-semibold text-card-foreground">{licencaLabels[licenca.tipo_licenca]}</h3></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label className={labelCls}>Status</label><select value={licenca.status || ""} onChange={e => updateLicenca(licenca.tipo_licenca, "status", e.target.value)} className={inputCls}><option value="">Não definido</option><option value="definitiva">Definitiva</option><option value="dispensada">Dispensada</option><option value="com_vencimento">Com Vencimento</option><option value="em_processo">Em Processo</option></select></div>
                    {licenca.status === "com_vencimento" && <div><label className={labelCls}>Data de Vencimento</label><input type="date" value={licenca.vencimento || ""} onChange={e => updateLicenca(licenca.tipo_licenca, "vencimento", e.target.value)} className={inputCls} /></div>}
                    {licenca.status === "em_processo" && <div><label className={labelCls}>Nº do Processo</label><input value={licenca.numero_processo || ""} onChange={e => updateLicenca(licenca.tipo_licenca, "numero_processo", e.target.value)} className={inputCls} placeholder="Número do processo" /></div>}
                  </div>
                  {licenca.status && (
                    <div className="flex items-center gap-2">
                      <span className={`badge-status ${licenca.status === "definitiva" ? "badge-success" : licenca.status === "dispensada" ? "badge-gray" : licenca.status === "com_vencimento" ? "badge-warning" : "badge-info"}`}>{licencaTipoLabels[licenca.status]}</span>
                      {licenca.status === "com_vencimento" && licenca.vencimento && <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarIcon size={12} /> {new Date(licenca.vencimento).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "configuracoes" && (
          <div className="space-y-8">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Settings size={20} className="text-primary" /> Configurações Gerais</h2>

            <div className="space-y-4">
              <h3 className="font-medium text-card-foreground">Módulos Ativos</h3>
              <p className="text-sm text-muted-foreground">Selecione em quais módulos esta empresa deve aparecer.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-muted rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={modulosAtivos.includes(mod.id)}
                      onChange={e => {
                        if (e.target.checked) setModulosAtivos(prev => [...prev, mod.id]);
                        else setModulosAtivos(prev => prev.filter(m => m !== mod.id));
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-card-foreground">Restrição de Acesso por Usuário</h3>
              <p className="text-sm text-muted-foreground">Oculte módulos específicos para determinados perfis. Por padrão, todos os usuários possuem acesso a todos os módulos ativos da empresa.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {profiles.map(prof => (
                    <button
                      key={prof.id}
                      onClick={() => setSelectedUserId(prof.user_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${selectedUserId === prof.user_id ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border hover:border-primary/30 text-card-foreground"}`}
                    >
                      <p className="font-medium text-sm">{prof.nome_completo || "Usuário"}</p>
                      <p className="text-xs opacity-70 mt-0.5">{prof.cpf || "Sem CPF"}</p>
                    </button>
                  ))}
                  {profiles.length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário ativo carregado.</p>}
                </div>

                <div className="md:col-span-2">
                  {selectedUserId ? (
                    <div className="p-5 bg-card rounded-xl border border-border space-y-4">
                      {(() => {
                        const selectedProf = profiles.find(p => p.user_id === selectedUserId);
                        return <h4 className="font-semibold text-card-foreground mb-4">Permissões para {selectedProf?.nome_completo}</h4>;
                      })()}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {AVAILABLE_MODULES.map(mod => {
                          const userMods = userAcessos[selectedUserId] || modulosAtivos;
                          const isAllowed = userMods.includes(mod.id);
                          const isModActive = modulosAtivos.includes(mod.id);

                          return (
                            <label key={mod.id} className={`flex items-center gap-2 text-sm p-3 rounded-lg border transition-all ${!isModActive ? "opacity-50 cursor-not-allowed bg-muted/50" : "cursor-pointer hover:bg-muted bg-background"}`}>
                              <input
                                type="checkbox"
                                disabled={!isModActive}
                                checked={isAllowed && isModActive}
                                onChange={e => {
                                  const currentMods = userAcessos[selectedUserId] || [...modulosAtivos];
                                  let newMods = [];
                                  if (e.target.checked) {
                                    newMods = [...currentMods, mod.id];
                                  } else {
                                    newMods = currentMods.filter(m => m !== mod.id);
                                  }
                                  setUserAcessos(prev => ({ ...prev, [selectedUserId]: newMods }));
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                              />
                              <span className={!isModActive ? "line-through text-muted-foreground" : "text-foreground"}>{mod.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="bg-info/10 text-info p-3 rounded-lg text-xs mt-4 flex gap-2 items-start opacity-80">
                        <span className="mt-0.5">ℹ️</span>
                        <p>Módulos desativados na aba "Módulos Ativos" ficarão inacessíveis independentemente desta configuração individual.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center bg-muted/30 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                      <div>
                        <Users size={32} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Selecione um usuário ao lado</p>
                        <p className="text-sm opacity-70 mt-1">Para configurar permissões específicas</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocietarioEmpresaPage;
