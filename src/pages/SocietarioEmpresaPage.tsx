import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, ref, onValue, set, push, update, remove } from "@/lib/firebase";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Building2, MapPin, Users, ScrollText,
  Plus, Trash2, Crown, Calendar as CalendarIcon, FileText
} from "lucide-react";

// ──── Types ────
interface Socio {
  id?: string;
  nome: string;
  cpf: string;
  administrador: boolean;
}

interface LicencaStatus {
  tipo: "definitiva" | "dispensada" | "com_vencimento" | "em_processo" | "";
  vencimento?: string;
  numeroProcesso?: string;
}

interface Licencas {
  alvara: LicencaStatus;
  vigilanciaSanitaria: LicencaStatus;
  corpoBombeiros: LicencaStatus;
  meioAmbiente: LicencaStatus;
}

interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

interface EmpresaData {
  nomeEmpresa: string;
  cnpj: string;
  dataAbertura: string;
  porteEmpresa: string;
  regimeTributario: string;
  naturezaJuridica: string;
  situacao: string;
  endereco: Endereco;
  socios: Record<string, Socio>;
  licencas: Licencas;
  dataCadastro?: string;
}

const emptyEndereco: Endereco = { logradouro: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" };
const emptyLicenca: LicencaStatus = { tipo: "" };
const emptyLicencas: Licencas = {
  alvara: { ...emptyLicenca },
  vigilanciaSanitaria: { ...emptyLicenca },
  corpoBombeiros: { ...emptyLicenca },
  meioAmbiente: { ...emptyLicenca },
};

const defaultEmpresa: EmpresaData = {
  nomeEmpresa: "",
  cnpj: "",
  dataAbertura: "",
  porteEmpresa: "",
  regimeTributario: "simples",
  naturezaJuridica: "",
  situacao: "ativa",
  endereco: { ...emptyEndereco },
  socios: {},
  licencas: { ...emptyLicencas },
};

const tabs = [
  { id: "dados", label: "Dados Gerais", icon: <Building2 size={16} /> },
  { id: "endereco", label: "Endereço", icon: <MapPin size={16} /> },
  { id: "socios", label: "Sócios", icon: <Users size={16} /> },
  { id: "licencas", label: "Licenças Municipais", icon: <ScrollText size={16} /> },
];

const licencaLabels: Record<string, string> = {
  alvara: "Alvará de Funcionamento",
  vigilanciaSanitaria: "Vigilância Sanitária",
  corpoBombeiros: "Corpo de Bombeiros",
  meioAmbiente: "Meio Ambiente",
};

const licencaTipoLabels: Record<string, string> = {
  definitiva: "Definitiva",
  dispensada: "Dispensada",
  com_vencimento: "Com Vencimento",
  em_processo: "Em Processo",
};

const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const SocietarioEmpresaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "nova";
  const [activeTab, setActiveTab] = useState("dados");
  const [empresa, setEmpresa] = useState<EmpresaData>({ ...defaultEmpresa });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // New socio form
  const [newSocio, setNewSocio] = useState<Socio>({ nome: "", cpf: "", administrador: false });

  useEffect(() => {
    if (isNew) return;
    const unsub = onValue(ref(db, `empresas/${id}`), (snap) => {
      const data = snap.val();
      if (data) {
        setEmpresa({
          ...defaultEmpresa,
          ...data,
          endereco: { ...emptyEndereco, ...data.endereco },
          licencas: {
            alvara: { ...emptyLicenca, ...data.licencas?.alvara },
            vigilanciaSanitaria: { ...emptyLicenca, ...data.licencas?.vigilanciaSanitaria },
            corpoBombeiros: { ...emptyLicenca, ...data.licencas?.corpoBombeiros },
            meioAmbiente: { ...emptyLicenca, ...data.licencas?.meioAmbiente },
          },
          socios: data.socios || {},
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!empresa.nomeEmpresa.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const newRef = push(ref(db, "empresas"));
        await set(newRef, { ...empresa, dataCadastro: new Date().toISOString() });
        toast.success("Empresa cadastrada com sucesso!");
        navigate(`/societario/${newRef.key}`);
      } else {
        await update(ref(db, `empresas/${id}`), empresa);
        toast.success("Empresa atualizada com sucesso!");
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const updateField = (field: string, value: any) => {
    setEmpresa((prev) => ({ ...prev, [field]: value }));
  };

  const updateEndereco = (field: keyof Endereco, value: string) => {
    setEmpresa((prev) => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
  };

  const updateLicenca = (key: keyof Licencas, field: string, value: string) => {
    setEmpresa((prev) => ({
      ...prev,
      licencas: {
        ...prev.licencas,
        [key]: { ...prev.licencas[key], [field]: value },
      },
    }));
  };

  const addSocio = () => {
    if (!newSocio.nome.trim()) {
      toast.error("Nome do sócio é obrigatório");
      return;
    }
    const socioId = `socio_${Date.now()}`;
    setEmpresa((prev) => ({
      ...prev,
      socios: { ...prev.socios, [socioId]: { ...newSocio } },
    }));
    setNewSocio({ nome: "", cpf: "", administrador: false });
    toast.success("Sócio adicionado!");
  };

  const removeSocio = (socioId: string) => {
    setEmpresa((prev) => {
      const { [socioId]: _, ...rest } = prev.socios;
      return { ...prev, socios: rest };
    });
    toast.success("Sócio removido!");
  };

  const toggleAdmin = (socioId: string) => {
    setEmpresa((prev) => ({
      ...prev,
      socios: {
        ...prev.socios,
        [socioId]: { ...prev.socios[socioId], administrador: !prev.socios[socioId].administrador },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-colors";
  const labelCls = "block text-sm font-medium text-card-foreground mb-1.5";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/societario")} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {isNew ? "Nova Empresa" : empresa.nomeEmpresa || "Empresa"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isNew ? "Preencha os dados para cadastrar" : "Editar informações da empresa"}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="module-card">
        {/* ── DADOS GERAIS ── */}
        {activeTab === "dados" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Building2 size={20} className="text-primary" /> Dados Gerais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Nome da Empresa *</label>
                <input value={empresa.nomeEmpresa} onChange={(e) => updateField("nomeEmpresa", e.target.value)} className={inputCls} placeholder="Razão Social" />
              </div>
              <div>
                <label className={labelCls}>CNPJ</label>
                <input value={empresa.cnpj} onChange={(e) => updateField("cnpj", e.target.value)} className={inputCls} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className={labelCls}>Data de Abertura</label>
                <input type="date" value={empresa.dataAbertura} onChange={(e) => updateField("dataAbertura", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Porte da Empresa</label>
                <select value={empresa.porteEmpresa} onChange={(e) => updateField("porteEmpresa", e.target.value)} className={inputCls}>
                  <option value="">Selecione</option>
                  <option value="mei">MEI</option>
                  <option value="me">Microempresa (ME)</option>
                  <option value="epp">Empresa de Pequeno Porte (EPP)</option>
                  <option value="medio">Médio Porte</option>
                  <option value="grande">Grande Porte</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Regime Tributário</label>
                <select value={empresa.regimeTributario} onChange={(e) => updateField("regimeTributario", e.target.value)} className={inputCls}>
                  <option value="simples">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                  <option value="mei">MEI</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Natureza Jurídica</label>
                <select value={empresa.naturezaJuridica} onChange={(e) => updateField("naturezaJuridica", e.target.value)} className={inputCls}>
                  <option value="">Selecione</option>
                  <option value="ei">Empresário Individual (EI)</option>
                  <option value="eireli">EIRELI</option>
                  <option value="ltda">Sociedade Limitada (LTDA)</option>
                  <option value="slu">Sociedade Limitada Unipessoal (SLU)</option>
                  <option value="sa">Sociedade Anônima (S.A.)</option>
                  <option value="ss">Sociedade Simples</option>
                  <option value="mei">MEI</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Situação</label>
                <select value={empresa.situacao} onChange={(e) => updateField("situacao", e.target.value)} className={inputCls}>
                  <option value="ativa">Ativa</option>
                  <option value="paralisada">Paralisada</option>
                  <option value="baixada">Baixada</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── ENDEREÇO ── */}
        {activeTab === "endereco" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <MapPin size={20} className="text-primary" /> Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelCls}>Logradouro</label>
                <input value={empresa.endereco.logradouro} onChange={(e) => updateEndereco("logradouro", e.target.value)} className={inputCls} placeholder="Rua, Avenida..." />
              </div>
              <div>
                <label className={labelCls}>Número</label>
                <input value={empresa.endereco.numero} onChange={(e) => updateEndereco("numero", e.target.value)} className={inputCls} placeholder="Nº" />
              </div>
              <div>
                <label className={labelCls}>Bairro</label>
                <input value={empresa.endereco.bairro} onChange={(e) => updateEndereco("bairro", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cidade</label>
                <input value={empresa.endereco.cidade} onChange={(e) => updateEndereco("cidade", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estado</label>
                <select value={empresa.endereco.estado} onChange={(e) => updateEndereco("estado", e.target.value)} className={inputCls}>
                  <option value="">Selecione</option>
                  {estados.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>CEP</label>
                <input value={empresa.endereco.cep} onChange={(e) => updateEndereco("cep", e.target.value)} className={inputCls} placeholder="00000-000" />
              </div>
            </div>
          </div>
        )}

        {/* ── SÓCIOS ── */}
        {activeTab === "socios" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Users size={20} className="text-primary" /> Quadro Societário
            </h2>

            {/* Add socio form */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
              <p className="text-sm font-medium text-card-foreground">Adicionar Sócio</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className={labelCls}>Nome Completo *</label>
                  <input value={newSocio.nome} onChange={(e) => setNewSocio({ ...newSocio, nome: e.target.value })} className={inputCls} placeholder="Nome do sócio" />
                </div>
                <div>
                  <label className={labelCls}>CPF</label>
                  <input value={newSocio.cpf} onChange={(e) => setNewSocio({ ...newSocio, cpf: e.target.value })} className={inputCls} placeholder="000.000.000-00" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newSocio.administrador} onChange={(e) => setNewSocio({ ...newSocio, administrador: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    Administrador
                  </label>
                  <button onClick={addSocio} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Socio list */}
            {Object.keys(empresa.socios).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum sócio cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(empresa.socios).map(([socioId, socio]) => (
                  <div key={socioId} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${socio.administrador ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>
                        {socio.administrador ? <Crown size={18} /> : <Users size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{socio.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          CPF: {socio.cpf || "—"} {socio.administrador && <span className="ml-2 badge-status badge-warning text-[10px]">Administrador</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAdmin(socioId)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-warning" title="Alternar administrador">
                        <Crown size={15} />
                      </button>
                      <button onClick={() => removeSocio(socioId)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Remover">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LICENÇAS MUNICIPAIS ── */}
        {activeTab === "licencas" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <ScrollText size={20} className="text-primary" /> Licenças Municipais
            </h2>
            <div className="space-y-4">
              {(Object.entries(licencaLabels) as [keyof Licencas, string][]).map(([key, label]) => {
                const licenca = empresa.licencas[key];
                return (
                  <div key={key} className="p-5 bg-muted/30 rounded-xl border border-border space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary" />
                      <h3 className="font-semibold text-card-foreground">{label}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Status</label>
                        <select
                          value={licenca.tipo}
                          onChange={(e) => updateLicenca(key, "tipo", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Não definido</option>
                          <option value="definitiva">Definitiva</option>
                          <option value="dispensada">Dispensada</option>
                          <option value="com_vencimento">Com Vencimento</option>
                          <option value="em_processo">Em Processo</option>
                        </select>
                      </div>
                      {licenca.tipo === "com_vencimento" && (
                        <div>
                          <label className={labelCls}>Data de Vencimento</label>
                          <input
                            type="date"
                            value={licenca.vencimento || ""}
                            onChange={(e) => updateLicenca(key, "vencimento", e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      )}
                      {licenca.tipo === "em_processo" && (
                        <div>
                          <label className={labelCls}>Nº do Processo</label>
                          <input
                            value={licenca.numeroProcesso || ""}
                            onChange={(e) => updateLicenca(key, "numeroProcesso", e.target.value)}
                            className={inputCls}
                            placeholder="Número do processo"
                          />
                        </div>
                      )}
                    </div>
                    {licenca.tipo && (
                      <div className="flex items-center gap-2">
                        <span className={`badge-status ${
                          licenca.tipo === "definitiva" ? "badge-success" :
                          licenca.tipo === "dispensada" ? "badge-gray" :
                          licenca.tipo === "com_vencimento" ? "badge-warning" :
                          "badge-info"
                        }`}>
                          {licencaTipoLabels[licenca.tipo]}
                        </span>
                        {licenca.tipo === "com_vencimento" && licenca.vencimento && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarIcon size={12} /> {new Date(licenca.vencimento).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocietarioEmpresaPage;
