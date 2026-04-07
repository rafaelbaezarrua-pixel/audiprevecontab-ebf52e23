import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Save, Building2, MapPin, Users, ScrollText, Plus, Trash2, Crown, Calendar as CalendarIcon, FileText, Settings, Shield, CheckCircle, Upload, Eye, Briefcase } from "lucide-react";
import { maskCNPJ, maskCPF, maskCPFCNPJ } from "@/lib/utils";

interface Socio { 
  id?: string; 
  nome: string; 
  cpf: string; 
  administrador: boolean; 
  percentual_cotas?: number;
  data_entrada?: string;
  data_saida?: string;
  email?: string;
  telefone?: string;
}
interface LicencaRow { id?: string; tipo_licenca: string; status: string | null; vencimento: string | null; numero_processo: string | null; }
interface Endereco { logradouro: string; numero: string; complemento?: string; bairro: string; city: string; state: string; cep: string; }

const emptyEndereco = { logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", cep: "" };

const tabs = [
  { id: "dados", label: "Dados Gerais", icon: <Building2 size={16} /> },
  { id: "endereco", label: "Endereço", icon: <MapPin size={16} /> },
  { id: "socios", label: "Sócios", icon: <Users size={16} /> },
  { id: "licencas", label: "Licenças Municipais", icon: <ScrollText size={16} /> },
  { id: "depto_pessoal", label: "Departamento Pessoal", icon: <Briefcase size={16} /> },
  { id: "configuracoes", label: "Configurações", icon: <Settings size={16} /> },
];

const licencaLabels: Record<string, string> = { alvara: "Alvará de Funcionamento", vigilancia_sanitaria: "Vigilância Sanitária", corpo_bombeiros: "Corpo de Bombeiros", meio_ambiente: "Meio Ambiente" };
const licencaTipoLabels: Record<string, string> = { definitiva: "Definitiva", dispensada: "Dispensada", com_vencimento: "Com Vencimento", em_processo: "Em Processo" };
const estados = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const AVAILABLE_MODULES = [
  { id: 'societario', label: 'Societário' },
  { id: 'agendamentos', label: 'Agendamentos' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'ocorrencias', label: 'Ocorrências' },
  { id: 'documentos', label: 'Assinaturas' },
  { id: 'recibos', label: 'Recibos' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'fiscal', label: 'Fiscal' },
  { id: 'pessoal', label: 'Pessoal' },
  { id: 'simulador', label: 'Simulador' },
  { id: 'licencas', label: 'Licenças' },
  { id: 'certificados', label: 'Certificados Digitais' },
  { id: 'certidoes', label: 'Certidões Negativas' },
  { id: 'procuracoes', label: 'Procurações' },
  { id: 'vencimentos', label: 'Vencimentos' },
  { id: 'parcelamentos', label: 'Parcelamentos' },
  { id: 'recalculos', label: 'Recálculos' },
  { id: 'honorarios', label: 'Honorários' },
  { id: 'irpf', label: 'IRPF' },
  { id: 'declaracoes_anuais', label: 'Declarações Anuais' },
  { id: 'declaracoes_mensais', label: 'Declarações Mensais' },
  { id: 'relatorios', label: 'Relatórios' },
];

const SocietarioEmpresaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { nome?: string; processoId?: string } | null;
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
  const [endereco, setEndereco] = useState<any>({ ...emptyEndereco });
  const [socios, setSocios] = useState<Socio[]>([]);
  const [licencas, setLicencas] = useState<LicencaRow[]>([]);
  const [newSocio, setNewSocio] = useState<Socio>({ 
    nome: "", 
    cpf: "", 
    administrador: false,
    percentual_cotas: 0,
    data_entrada: "",
    data_saida: "",
    email: "",
    telefone: ""
  });

  // New RFB fields
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [capitalSocial, setCapitalSocial] = useState<number | null>(null);
  const [cnaeFiscal, setCnaeFiscal] = useState<number | null>(null);
  const [cnaeFiscalDescricao, setCnaeFiscalDescricao] = useState("");
  const [emailRfb, setEmailRfb] = useState("");
  const [telefoneRfb, setTelefoneRfb] = useState("");
  const [qsa, setQsa] = useState<any[]>([]);
  const [infoRfbCompleta, setInfoRfbCompleta] = useState<any>(null);
  const [opcaoSimples, setOpcaoSimples] = useState<boolean>(false);
  const [dataOpcaoSimples, setDataOpcaoSimples] = useState("");
  const [opcaoMei, setOpcaoMei] = useState<boolean>(false);
  const [dataOpcaoMei, setDataOpcaoMei] = useState("");
  const [porteRfb, setPorteRfb] = useState("");
  const [dataExclusaoSimples, setDataExclusaoSimples] = useState("");
  const [dataExclusaoSimei, setDataExclusaoSimei] = useState("");
  const [consultingRFB, setConsultingRFB] = useState(false);
  
  // Pessoal config
  const [possuiFuncionarios, setPossuiFuncionarios] = useState(false);
  const [somenteProlabore, setSomenteProlabore] = useState(false);
  const [possuiCartaoPonto, setPossuiCartaoPonto] = useState(false);

  // Config params
  const { userData } = useAuth();
  const isAdmin = userData?.isAdmin || false;
  const [modulosAtivos, setModulosAtivos] = useState<string[]>(AVAILABLE_MODULES.map(m => m.id));
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userAcessos, setUserAcessos] = useState<Record<string, string[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!isAdmin) return;
      const { data: profiles } = await supabase.from("profiles").select("*").eq("ativo", true);
      if (!profiles) return;
      const userIds = profiles.map(p => p.user_id);
      const [{ data: roles }, { data: access }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("empresa_acessos").select("user_id").in("user_id", userIds)
      ]);
      const clientIds = new Set([
        ...(roles?.filter(r => (r.role as any) === 'client').map(r => r.user_id) || []),
      ]);
      const internalProfiles = profiles.filter(p => !clientIds.has(p.user_id));
      setProfiles(internalProfiles);
    };
    fetchProfiles();

    if (isNew) {
      if (state?.nome) setNomeEmpresa(state.nome);
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
        setEndereco(emp.endereco || { ...emptyEndereco });
        setModulosAtivos(emp.modulos_ativos || AVAILABLE_MODULES.map(m => m.id));
        setNomeFantasia(emp.nome_fantasia || "");
        setCapitalSocial(emp.capital_social || null);
        setCnaeFiscal(emp.cnae_fiscal || null);
        setCnaeFiscalDescricao(emp.cnae_fiscal_descricao || "");
        setEmailRfb(emp.email_rfb || "");
        setTelefoneRfb(emp.telefone_rfb || "");
        setQsa((emp.qsa as any[]) || []);
        setInfoRfbCompleta(emp.info_rfb_completa || null);
        setOpcaoSimples(emp.opcao_pelo_simples || false);
        setDataOpcaoSimples(emp.data_opcao_pelo_simples || "");
        setOpcaoMei(emp.opcao_pelo_mei || false);
        setDataOpcaoMei(emp.data_opcao_pelo_mei || "");
        setPorteRfb(emp.porte_rfb || "");
        setDataExclusaoSimples(emp.data_exclusao_simples || "");
        setDataExclusaoSimei(emp.data_exclusao_simei || "");
        setPossuiFuncionarios((emp as any).possui_funcionarios || false);
        setSomenteProlabore((emp as any).somente_pro_labore || false);
        setPossuiCartaoPonto((emp as any).possui_cartao_ponto || false);
      }

      if (isAdmin) {
        const { data: acessos } = await supabase.from("empresa_acessos").select("*").eq("empresa_id", id);
        const acessosMap: Record<string, string[]> = {};
        if (acessos) acessos.forEach(a => { acessosMap[a.user_id] = a.modulos_permitidos; });
        setUserAcessos(acessosMap);
      }

      const { data: sociosData } = await supabase.from("socios").select("*").order("nome", { ascending: true }).eq("empresa_id", id);
      setSocios((sociosData || []).map((s: any) => ({ 
        id: s.id, 
        nome: s.nome, 
        cpf: s.cpf || "", 
        administrador: s.administrador || false,
        percentual_cotas: s.percentual_cotas || 0,
        data_entrada: s.data_entrada || "",
        data_saida: s.data_saida || "",
        email: s.email || "",
        telefone: s.telefone || ""
      })));

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
        modulos_ativos: modulosAtivos,
        nome_fantasia: nomeFantasia || null,
        capital_social: capitalSocial,
        cnae_fiscal: cnaeFiscal,
        cnae_fiscal_descricao: cnaeFiscalDescricao || null,
        email_rfb: emailRfb || null,
        telefone_rfb: telefoneRfb || null,
        qsa: qsa,
        info_rfb_completa: infoRfbCompleta,
        opcao_pelo_simples: opcaoSimples,
        data_opcao_pelo_simples: dataOpcaoSimples || null,
        opcao_pelo_mei: opcaoMei,
        data_opcao_pelo_mei: dataOpcaoMei || null,
        porte_rfb: porteRfb || null,
        data_exclusao_simples: dataExclusaoSimples || null,
        data_exclusao_simei: dataExclusaoSimei || null,
        possui_funcionarios: possuiFuncionarios,
        somente_pro_labore: somenteProlabore,
        possui_cartao_ponto: possuiCartaoPonto
      };

      let empresaId = id;
      if (isNew) {
        const { data, error } = await supabase.from("empresas").insert(empresaData as any).select("id").single();
        if (error) throw error;
        empresaId = data.id;
      } else {
        const { error } = await supabase.from("empresas").update(empresaData as any).eq("id", id);
        if (error) throw error;
      }

      if (!isNew) await supabase.from("socios").delete().eq("empresa_id", empresaId!);
      if (socios.length > 0) {
        const { error: socError } = await supabase.from("socios").insert(socios.map(s => ({ 
          empresa_id: empresaId!, 
          nome: s.nome, 
          cpf: s.cpf || null, 
          administrador: s.administrador,
          percentual_cotas: s.percentual_cotas || 0,
          data_entrada: s.data_entrada || null,
          data_saida: s.data_saida || null,
          email: s.email || null,
          telefone: s.telefone || null
        })));
        if (socError) throw socError;
      }

      if (!isNew) await supabase.from("licencas").delete().eq("empresa_id", empresaId!);
      const licToInsert = licencas.filter(l => l.status);
      if (licToInsert.length > 0) {
        const { error: licError } = await supabase.from("licencas").insert(licToInsert.map(l => ({ empresa_id: empresaId!, tipo_licenca: l.tipo_licenca, status: l.status as any, vencimento: l.vencimento || null, numero_processo: l.numero_processo || null })));
        if (licError) throw licError;
      }

      if (isAdmin) {
        if (!isNew && empresaId) await supabase.from("empresa_acessos").delete().eq("empresa_id", empresaId);
        const acessosToInsert = Object.entries(userAcessos).map(([uid, mods]) => ({ empresa_id: empresaId!, user_id: uid, modulos_permitidos: mods }));
        if (acessosToInsert.length > 0) {
          const { error: accError } = await supabase.from("empresa_acessos").insert(acessosToInsert);
          if (accError) throw accError;
        }
      }

      if (isNew && state?.processoId) await supabase.from("processos_societarios" as any).update({ status: 'concluido' }).eq("id", state.processoId);
      toast.success(isNew ? "Empresa cadastrada com sucesso!" : "Empresa atualizada com sucesso!");
      navigate(`/societario`);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  const handleConsultaRFB = async () => {
    if (!cnpj) { toast.error("Informe o CNPJ para consulta"); return; }
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) { toast.error("CNPJ inválido"); return; }
    setConsultingRFB(true);
    const tid = toast.loading("Consultando RFB via BrazilAPI...");
    try {
      let data = null;
      let error = null;

      // Try BrazilAPI first
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
        if (response.ok) {
          data = await response.json();
        } else {
          const errData = await response.json();
          error = errData.message || "Erro na BrazilAPI";
        }
      } catch (e) {
        console.warn("BrazilAPI failed (possibly CORS):", e);
      }

      // If BrazilAPI failed, try CNPJ.ws (Publica) as primary
      if (!data) {
        try {
          const wsResponse = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCNPJ}`);
          if (wsResponse.ok) {
            const wsData = await wsResponse.json();
            // Map CNPJ.ws data to BrazilAPI format for compatibility
            data = {
              razao_social: wsData.raza_social,
              nome_fantasia: wsData.estabelecimento.nome_fantasia,
              data_inicio_atividade: wsData.estabelecimento.data_inicio_atividade,
              capital_social: parseFloat(wsData.capital_social),
              opcao_pelo_simples: wsData.simples?.optante === "Sim",
              data_opcao_pelo_simples: wsData.simples?.data_opcao_simples,
              opcao_pelo_simei: wsData.simples?.mei === "Sim",
              data_opcao_pelo_simei: wsData.simples?.data_opcao_mei,
              cnae_fiscal: wsData.estabelecimento.cnae_fiscal_principal.codigo,
              cnae_fiscal_descricao: wsData.estabelecimento.cnae_fiscal_principal.descricao,
              email: wsData.estabelecimento.email,
              ddd_telefone_1: wsData.estabelecimento.ddd1 + wsData.estabelecimento.telefone1,
              logradouro: wsData.estabelecimento.logradouro,
              numero: wsData.estabelecimento.numero,
              complemento: wsData.estabelecimento.complemento,
              bairro: wsData.estabelecimento.bairro,
              municipio: wsData.estabelecimento.cidade.nome,
              uf: wsData.estabelecimento.estado.sigla,
              cep: wsData.estabelecimento.cep,
              qsa: wsData.socios?.map((s: any) => ({
                nome_socio: s.nome,
                cnpj_cpf_do_socio: s.cpf_cnpj,
                qualificacao_socio: s.qualificacao_socio.descricao
              })),
              porte: wsData.porte.descricao,
              natureza_juridica: wsData.natureza_juridica.descricao
            };
          }
        } catch (e) {
          console.error("CNPJ.ws failed as fallback:", e);
        }
      }

      if (!data) throw new Error(error || "Não foi possível consultar os dados do CNPJ. Verifique sua conexão ou tente novamente mais tarde.");
      
      if (data.razao_social) setNomeEmpresa(data.razao_social);
      if (data.nome_fantasia) setNomeFantasia(data.nome_fantasia);
      if (data.data_inicio_atividade) setDataAbertura(data.data_inicio_atividade);
      if (data.capital_social) setCapitalSocial(data.capital_social);
      setOpcaoSimples(data.opcao_pelo_simples || false);
      setDataOpcaoSimples(data.data_opcao_pelo_simples || "");
      setOpcaoMei(data.opcao_pelo_simei || false);
      setDataOpcaoMei(data.data_opcao_pelo_simei || "");
      setDataExclusaoSimples(data.data_exclusao_do_simples || "");
      setDataExclusaoSimei(data.data_exclusao_do_simei || "");
      if (data.cnae_fiscal) setCnaeFiscal(data.cnae_fiscal);
      if (data.cnae_fiscal_descricao) setCnaeFiscalDescricao(data.cnae_fiscal_descricao);
      
      setEmailRfb(data.email || "");
      
      let fullTelefone = "";
      if (data.ddd_telefone_1) {
        const tel = String(data.ddd_telefone_1).replace(/\D/g, "");
        if (tel.length >= 10) fullTelefone = `(${tel.substring(0, 2)}) ${tel.substring(2)}`;
        else fullTelefone = data.ddd_telefone_1;
      }
      setTelefoneRfb(fullTelefone);

      setEndereco({
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.municipio || "",
        estado: data.uf || "",
        cep: data.cep || ""
      });

      if (data.qsa && Array.isArray(data.qsa)) {
        setQsa(data.qsa);
        const autoSocios: Socio[] = data.qsa.map((s: any) => ({
          nome: s.nome_socio || s.nome_fantasia || s.nome_completo || s.nome || "",
          cpf: s.cnpj_cpf_do_socio || s.cpf_cnpj || "",
          administrador: s.qualificacao_socio?.toLowerCase().includes("administrador") || [10, 16, 5, 49].includes(s.codigo_qualificacao_socio)
        }));
        if (autoSocios.length > 0) setSocios(autoSocios);
      }
      
      if (data.porte) setPorteRfb(data.porte);
      
      // Map situation from RFB
      const rfbSituacao = String(data.descricao_situacao_cadastral || "").toLowerCase();
      if (["ativa", "baixada", "inapta", "suspensa", "nula"].includes(rfbSituacao)) {
        setSituacao(rfbSituacao);
      } else if (rfbSituacao === "paralisada") {
        setSituacao("paralisada");
      }

      // Heuristics for types
      const isMEIByOption = data.opcao_pelo_simei === true;
      const porteLabel = data.porte?.toLowerCase() || "";
      
      if (isMEIByOption || porteLabel.includes("mei")) {
        setPorteEmpresa("mei"); setRegimeTributario("simei"); setNaturezaJuridica("mei");
        if (rfbSituacao === "ativa") setSituacao("mei");
      } else {
         if (porteLabel.includes("me") || data.codigo_porte === 1) setPorteEmpresa("me");
         else if (porteLabel.includes("epp") || data.codigo_porte === 3) setPorteEmpresa("epp");
         else if (data.codigo_porte === 5) setPorteEmpresa("grande");
         
         const natureLabel = data.natureza_juridica?.toLowerCase() || "";
         if (natureLabel.includes("unipessoal")) setNaturezaJuridica("slu");
         else if (natureLabel.includes("limitada")) setNaturezaJuridica("ltda");
         else if (natureLabel.includes("individual")) setNaturezaJuridica("ei");
         
         if (data.opcao_pelo_simples) setRegimeTributario("simples");
         else setRegimeTributario("lucro_presumido");
      }
      
      setInfoRfbCompleta(data);
      toast.success("Dados preenchidos com sucesso!", { id: tid });
    } catch (err: any) {
      toast.error(`Falha na consulta: ${err.message}`, { id: tid });
    } finally { setConsultingRFB(false); }
  };

  const addSocio = () => {
    if (!newSocio.nome.trim()) { toast.error("Nome do sócio é obrigatório"); return; }
    setSocios(prev => [...prev, { ...newSocio }]);
    setNewSocio({ 
      nome: "", 
      cpf: "", 
      administrador: false,
      percentual_cotas: 0,
      data_entrada: "",
      data_saida: "",
      email: "",
      telefone: ""
    });
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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando dados da empresa...</p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-colors";
  const labelCls = "block text-sm font-medium text-card-foreground mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/societario")} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft size={20} /></button>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <button
              onClick={async () => {
                if (!cnpj || !emailRfb) { toast.error("Dados incompletos para criar acesso."); return; }
                const cleanCNPJ = cnpj.replace(/\D/g, "");
                toast.loading("Criando acesso...", { id: "sync" });
                try {
                  const { error } = await supabase.functions.invoke("create-user", {
                    body: { email: emailRfb, nome: nomeEmpresa, password: cleanCNPJ, role: 'client', empresa_id: id }
                  });
                  if (error) throw error;
                  toast.success("Acesso criado com sucesso!", { id: "sync" });
                } catch (err: any) { toast.error("Erro: " + err.message, { id: "sync" }); }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-info/10 text-info hover:bg-info/20 transition-all shadow-sm"
            >
              <Shield size={16} /> Criar Acesso Portal
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="button-premium flex items-center gap-2"
          >
            <Save size={18} /> {saving ? "Salvando..." : "Salvar Empresa"}
          </button>
        </div>
      </div>

      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="module-card">
        {activeTab === "dados" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Building2 size={20} className="text-primary" /> Dados Gerais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className={labelCls}>Nome da Empresa *</label><input value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} className={inputCls} placeholder="Razão Social" /></div>
              <div>
                <label className={labelCls}>CNPJ</label>
                <div className="flex gap-2">
                  <input value={cnpj} onChange={e => setCnpj(maskCNPJ(e.target.value))} className={inputCls} placeholder="00.000.000/0000-00" />
                  <button onClick={handleConsultaRFB} disabled={consultingRFB} type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm whitespace-nowrap">
                    <Eye size={16} /> {consultingRFB ? "Consultando..." : "Consulta RFB"}
                  </button>
                </div>
              </div>
              <div><label className={labelCls}>Data de Abertura</label><input type="date" value={dataAbertura} onChange={e => setDataAbertura(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Nome Fantasia</label><input value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} className={inputCls} placeholder="Nome Fantasia" /></div>
              <div><label className={labelCls}>CNAE Principal</label><input value={cnaeFiscal || ""} onChange={e => setCnaeFiscal(parseInt(e.target.value) || null)} className={inputCls} placeholder="Código CNAE" /></div>
              <div><label className={labelCls}>Descrição CNAE</label><input value={cnaeFiscalDescricao} onChange={e => setCnaeFiscalDescricao(e.target.value)} className={inputCls} placeholder="Atividade principal" /></div>
              <div><label className={labelCls}>E-mail RFB</label><input type="email" value={emailRfb} onChange={e => setEmailRfb(e.target.value)} className={inputCls} placeholder="email@rfb.com" /></div>
              <div><label className={labelCls}>Telefone RFB</label><input value={telefoneRfb} onChange={e => setTelefoneRfb(e.target.value)} className={inputCls} placeholder="(00) 0000-0000" /></div>
              <div>
                <label className={labelCls}>Porte da Empresa</label>
                <div className="space-y-2">
                  <select value={porteEmpresa} onChange={e => setPorteEmpresa(e.target.value)} className={inputCls}>
                    <option value="">Selecione</option><option value="mei">MEI</option><option value="me">Microempresa (ME)</option><option value="epp">Empresa de Pequeno Porte (EPP)</option><option value="medio">Médio Porte</option><option value="grande">Grande Porte</option>
                  </select>
                  {porteRfb && <p className="text-[10px] text-muted-foreground ml-1 italic">RFB: {porteRfb}</p>}
                </div>
              </div>
              <div><label className={labelCls}>Regime Tributário</label><select value={regimeTributario} onChange={e => setRegimeTributario(e.target.value)} className={inputCls}><option value="simples">Simples Nacional</option><option value="lucro_presumido">Lucro Presumido</option><option value="lucro_real">Lucro Real</option><option value="simei">Simei (MEI)</option><option value="mei">MEI</option></select></div>
              <div><label className={labelCls}>Natureza Jurídica</label><select value={naturezaJuridica} onChange={e => setNaturezaJuridica(e.target.value)} className={inputCls}><option value="">Selecione</option><option value="ei">Empresário Individual (EI)</option><option value="eireli">EIRELI</option><option value="ltda">Sociedade Limitada (LTDA)</option><option value="slu">Sociedade Limitada Unipessoal (SLU)</option><option value="sa">Sociedade Anônima (S.A.)</option><option value="ss">Sociedade Simples</option><option value="mei">MEI</option></select></div>
              <div><label className={labelCls}>Situação Cadastral</label><select value={situacao} onChange={e => setSituacao(e.target.value)} className={inputCls}><option value="ativa">Ativa</option><option value="paralisada">Paralisada</option><option value="baixada">Baixada</option><option value="mei">MEI</option><option value="inapta">Inapta</option><option value="suspensa">Suspensa</option><option value="nula">Nula</option><option value="entregue">Empresa Entregue</option></select></div>
              
              <div className="md:col-span-2 p-4 bg-primary/5 rounded-xl border border-primary/10 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="opt-simples" checked={opcaoSimples} onChange={e => setOpcaoSimples(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <label htmlFor="opt-simples" className="text-sm font-semibold text-card-foreground">Optante pelo Simples Nacional</label>
                  </div>
                  {opcaoSimples ? (
                    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="shrink-0"><label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Data de Opção</label><input type="date" value={dataOpcaoSimples} onChange={e => setDataOpcaoSimples(e.target.value)} className={inputCls + " h-9 text-xs"} /></div>
                    </div>
                  ) : dataExclusaoSimples ? (
                    <div className="ml-6 shrink-0"><label className="text-[10px] uppercase font-bold text-destructive mb-1 block">Data de Exclusão</label><input type="date" value={dataExclusaoSimples} onChange={e => setDataExclusaoSimples(e.target.value)} className={inputCls + " h-9 text-xs border-destructive/30"} /></div>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="opt-mei" checked={opcaoMei} onChange={e => setOpcaoMei(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <label htmlFor="opt-mei" className="text-sm font-semibold text-card-foreground">Optante pelo SIMEI (MEI)</label>
                  </div>
                  {opcaoMei ? (
                    <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="shrink-0"><label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Data de Opção MEI</label><input type="date" value={dataOpcaoMei} onChange={e => setDataOpcaoMei(e.target.value)} className={inputCls + " h-9 text-xs"} /></div>
                    </div>
                  ) : dataExclusaoSimei ? (
                    <div className="ml-6 shrink-0"><label className="text-[10px] uppercase font-bold text-destructive mb-1 block">Data de Exclusão MEI</label><input type="date" value={dataExclusaoSimei} onChange={e => setDataExclusaoSimei(e.target.value)} className={inputCls + " h-9 text-xs border-destructive/30"} /></div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "endereco" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><MapPin size={20} className="text-primary" /> Endereço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className={labelCls}>Logradouro</label><input value={endereco.logradouro} onChange={e => setEndereco({ ...endereco, logradouro: e.target.value })} className={inputCls} placeholder="Rua, Avenida..." /></div>
              <div><label className={labelCls}>Número</label><input value={endereco.numero} onChange={e => setEndereco({ ...endereco, numero: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Complemento</label><input value={endereco.complemento || ""} onChange={e => setEndereco({ ...endereco, complemento: e.target.value })} className={inputCls} placeholder="Apto, Sala..." /></div>
              <div><label className={labelCls}>Bairro</label><input value={endereco.bairro} onChange={e => setEndereco({ ...endereco, bairro: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Cidade</label><input value={endereco.cidade} onChange={e => setEndereco({ ...endereco, cidade: e.target.value })} className={inputCls} /></div>
              <div><label className={labelCls}>Estado</label><select value={endereco.estado} onChange={e => setEndereco({ ...endereco, estado: e.target.value })} className={inputCls}><option value="">Selecione</option>{estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}</select></div>
              <div><label className={labelCls}>CEP</label><input value={endereco.cep} onChange={e => setEndereco({ ...endereco, cep: e.target.value })} className={inputCls} placeholder="00000-000" /></div>
            </div>
          </div>
        )}

        {activeTab === "socios" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Users size={20} className="text-primary" /> Quadro Societário</h2>
              <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Capital Social:</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">R$</span>
                  <input type="number" value={capitalSocial || ""} onChange={e => setCapitalSocial(parseFloat(e.target.value) || null)} className={inputCls + " h-9 pl-9 w-40 font-bold text-primary bg-background/50 border-primary/20"} placeholder="0,00" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
              <p className="text-sm font-medium text-card-foreground">Adicionar Sócio</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2"><label className={labelCls}>Nome Completo *</label><input value={newSocio.nome} onChange={e => setNewSocio({ ...newSocio, nome: e.target.value })} className={inputCls} placeholder="Nome do sócio" /></div>
                <div><label className={labelCls}>CPF / CNPJ</label><input value={newSocio.cpf} onChange={e => setNewSocio({ ...newSocio, cpf: maskCPFCNPJ(e.target.value) })} className={inputCls} placeholder="000.000.000-00 ou 00.000.000/0000-00" /></div>
                <div><label className={labelCls}>Capital (%)</label><input type="number" step="0.01" value={newSocio.percentual_cotas} onChange={e => setNewSocio({ ...newSocio, percentual_cotas: parseFloat(e.target.value) || 0 })} className={inputCls} placeholder="0.00" /></div>
                <div><label className={labelCls}>E-mail</label><input type="email" value={newSocio.email} onChange={e => setNewSocio({ ...newSocio, email: e.target.value })} className={inputCls} placeholder="email@exemplo.com" /></div>
                <div><label className={labelCls}>Telefone</label><input value={newSocio.telefone} onChange={e => setNewSocio({ ...newSocio, telefone: e.target.value })} className={inputCls} placeholder="(00) 00000-0000" /></div>
                <div><label className={labelCls}>Data Entrada</label><input type="date" value={newSocio.data_entrada} onChange={e => setNewSocio({ ...newSocio, data_entrada: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>Data Saída</label><input type="date" value={newSocio.data_saida} onChange={e => setNewSocio({ ...newSocio, data_saida: e.target.value })} className={inputCls} /></div>
                <div className="flex items-center gap-3 h-[42px] mb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={newSocio.administrador} onChange={e => setNewSocio({ ...newSocio, administrador: e.target.checked })} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" /> ADM</label>
                  <button onClick={addSocio} className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground min-w-[100px]" style={{ background: "var(--gradient-primary)" }}><Plus size={14} /> Add</button>
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
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${socio.administrador ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"}`}>{socio.administrador ? <Crown size={18} /> : <Users size={18} />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-card-foreground truncate">{socio.nome}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap"><Shield size={10} /> {socio.cpf || "Documento não inf."}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Briefcase size={10} /> {socio.percentual_cotas || 0}% de Capital</p>
                          {socio.data_entrada && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><CalendarIcon size={10} /> Entrou em {formatDateBR(socio.data_entrada)}</p>}
                          {socio.email && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">@ {socio.email}</p>}
                        </div>
                        {socio.administrador && <span className="mt-2 inline-block badge-status badge-warning text-[10px]">Sócio Administrador</span>}
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
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "depto_pessoal" && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Briefcase size={20} className="text-primary" /> Departamento Pessoal</h2>
            
            <div className="p-5 bg-muted/30 rounded-xl border border-border space-y-4 max-w-2xl">
              <p className="text-sm text-muted-foreground mb-4">
                Configurações que definem como a empresa será listada no módulo Pessoal. Caso a empresa não tenha movimentação no departamento, deixe ambas as opções desmarcadas.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={possuiFuncionarios} 
                      onChange={e => {
                        setPossuiFuncionarios(e.target.checked);
                        if (e.target.checked) setSomenteProlabore(false);
                      }} 
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary" 
                    />
                  </div>
                  <div>
                    <span className="block font-medium text-card-foreground">Folha de Pagamento</span>
                    <span className="text-sm text-muted-foreground">A empresa possui funcionários e folha de pagamento ativa. Ela aparecerá na aba "Folha" do módulo Pessoal, com todos os encargos exigidos.</span>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={somenteProlabore} 
                      onChange={e => {
                        setSomenteProlabore(e.target.checked);
                        if (e.target.checked) setPossuiFuncionarios(false);
                      }} 
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary" 
                    />
                  </div>
                  <div>
                    <span className="block font-medium text-card-foreground">Somente Pró-labore</span>
                    <span className="text-sm text-muted-foreground">A empresa só tem retirada de sócios (sem folha CLT). Ela aparecerá numa aba simplificada onde basta marcar se foi gerada ou não.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors border-indigo-500/20">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      checked={possuiCartaoPonto} 
                      onChange={e => setPossuiCartaoPonto(e.target.checked)} 
                      className="w-5 h-5 rounded border-indigo-500 text-indigo-600 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <span className="block font-medium text-indigo-900 dark:text-indigo-100">Ponto Manual</span>
                    <span className="text-sm text-indigo-700/70 dark:text-indigo-300/70">Habilita a sub-aba de cálculo de ponto e recibos no módulo Pessoal. Opção fixa para controle de jornada.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "configuracoes" && (
          <div className="space-y-8">
            <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2"><Settings size={20} className="text-primary" /> Configurações Gerais</h2>
            <div className="space-y-4">
              <h3 className="font-medium text-card-foreground">Módulos Ativos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-border">
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-muted rounded-lg transition-colors">
                    <input type="checkbox" checked={modulosAtivos.includes(mod.id)} onChange={e => { if (e.target.checked) setModulosAtivos(prev => [...prev, mod.id]); else setModulosAtivos(prev => prev.filter(m => m !== mod.id)); }} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="space-y-4 pt-6 mt-6 border-t border-border">
                <h3 className="font-medium text-card-foreground">Restrição de Acesso por Usuário</h3>
                <p className="text-sm text-muted-foreground mb-4">Selecione os usuários da equipe que terão acesso limitado a certos módulos desta empresa.</p>
                
                {profiles.length === 0 ? (
                  <div className="p-4 bg-muted/30 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                    Nenhum usuário apto para configuração de acessos encontrado.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profiles.map(user => {
                      const hasCustomRule = !!userAcessos[user.user_id];
                      const allowedModules = userAcessos[user.user_id] || modulosAtivos;
                      const userName = user.nome_completo || user.full_name || "Usuário sem nome";
                      
                      return (
                        <div key={user.user_id} className="p-4 bg-card rounded-xl border border-border transition-all hover:border-primary/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Shield size={16} className={hasCustomRule ? "text-primary" : "text-muted-foreground"} />
                              <span className="text-sm font-bold text-card-foreground">{userName}</span>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={hasCustomRule} 
                                onChange={e => {
                                  if (e.target.checked) {
                                    setUserAcessos(prev => ({ ...prev, [user.user_id]: [...modulosAtivos] }));
                                    setSelectedUserId(user.user_id);
                                  } else {
                                    const newAcessos = { ...userAcessos };
                                    delete newAcessos[user.user_id];
                                    setUserAcessos(newAcessos);
                                    if (selectedUserId === user.user_id) setSelectedUserId(null);
                                  }
                                }} 
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary" 
                              />
                              {hasCustomRule ? "Acesso Restrito" : "Acesso Total"}
                            </label>
                          </div>
                          
                          {hasCustomRule && (
                            <div className="mt-3 pt-3 border-t border-border/50 animate-in fade-in">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-widest">
                                Módulos Permitidos
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {modulosAtivos.map(modId => {
                                  const modInfo = AVAILABLE_MODULES.find(m => m.id === modId);
                                  if (!modInfo) return null;
                                  const isAllowed = allowedModules.includes(modId);
                                  
                                  return (
                                    <button
                                      key={modId}
                                      onClick={() => {
                                        const current = userAcessos[user.user_id] || [];
                                        if (isAllowed) {
                                          setUserAcessos(prev => ({ ...prev, [user.user_id]: current.filter(m => m !== modId) }));
                                        } else {
                                          setUserAcessos(prev => ({ ...prev, [user.user_id]: [...current, modId] }));
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border ${isAllowed ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                                    >
                                      {modInfo.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocietarioEmpresaPage;
