import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Download, Calendar, DollarSign, Calculator,
  Shield, Users, AlertCircle, Building2,
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  ArrowLeft, Search, Filter, Layers, ListChecks,
  FileSpreadsheet, History
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import { tipoProcessoLabels } from "@/constants/societario";

interface ModuleConfig {
  id: string;
  label: string;
  table: string;
  icon: React.ReactNode;
  color: string;
  fields: { id: string; label: string; accessor?: (item: any) => any }[];
}

const COMPANY_FIELDS = [
  { id: "cnpj", label: "CNPJ" },
  { id: "nome_fantasia", label: "Nome Fantasia" },
  { id: "regime_tributario", label: "Regime Tributário" },
  { id: "natureza_juridica", label: "Natureza Jurídica" },
  { id: "data_abertura", label: "Abertura" },
  { id: "porte_empresa", label: "Porte" },
  { id: "socios_count", label: "Nº Sócios" },
  { id: "capital_social", label: "Capital Social", accessor: (i: any) => i.capital_social ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.capital_social) : "—" },
  { id: "cnae_fiscal", label: "CNAE" },
  { id: "cnae_fiscal_descricao", label: "Atividade Principal" },
  { id: "email_rfb", label: "E-mail RFB" },
  { id: "telefone_rfb", label: "Telefone RFB" },
  { id: "qsa", label: "Sócios (QSA)", accessor: (i: any) => i.qsa && Array.isArray(i.qsa) ? i.qsa.map((s: any) => s.nome || s.nome_socio).join(", ") : "—" },
];

const licencaLabels: Record<string, string> = { 
  alvara: "Alvará", 
  vigilancia_sanitaria: "Vigilância", 
  corpo_bombeiros: "Bombeiros", 
  meio_ambiente: "Meio Ambiente" 
};

const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: "societario",
    label: "Societário (Empresas)",
    table: "empresas",
    icon: <Building2 size={18} />,
    color: "bg-blue-500",
    fields: [
      { id: "situacao", label: "Situação" },
      { id: "opcao_pelo_simples", label: "Optante Simples", accessor: (i) => i.opcao_pelo_simples ? "Sim" : "Não" },
      { id: "data_opcao_pelo_simples", label: "Data Opção Simples", accessor: (i) => safeFormatDate(i.data_opcao_pelo_simples) },
      { id: "opcao_pelo_mei", label: "Optante MEI", accessor: (i) => i.opcao_pelo_mei ? "Sim" : "Não" },
      { id: "data_opcao_pelo_mei", label: "Data Opção MEI", accessor: (i) => safeFormatDate(i.data_opcao_pelo_mei) },
      { id: "porte_rfb", label: "Porte (RFB)" },
    ]
  },
  {
    id: "fiscal",
    label: "Fiscal",
    table: "fiscal",
    icon: <Shield size={18} />,
    color: "bg-purple-500",
    fields: [
      { id: "tipo_nota", label: "Tipo de Nota" },
      { id: "status_guia", label: "Status da Guia" },
      { id: "competencia", label: "Competência" },
      { id: "data_envio", label: "Data de Envio" },
      { id: "aliquota", label: "Alíquota (%)" },
    ]
  },
  {
    id: "pessoal",
    label: "Depto. Pessoal",
    table: "pessoal",
    icon: <Users size={18} />,
    color: "bg-emerald-500",
    fields: [
      { id: "qtd_funcionarios", label: "Qtd Funcionários" },
      { id: "qtd_pro_labore", label: "Qtd Pró-Labore" },
      { id: "qtd_recibos", label: "Qtd Recibos" },
      { id: "dctf_web_gerada", label: "DCTF Web Gerada", accessor: (i) => i.dctf_web_gerada ? "Sim" : "Não" },
      { id: "fgts_status", label: "Status FGTS" },
      { id: "inss_status", label: "Status INSS" },
    ]
  },
  {
    id: "honorarios",
    label: "Honorários",
    table: "honorarios_mensal",
    icon: <DollarSign size={18} />,
    color: "bg-amber-500",
    fields: [
      { id: "competencia", label: "Competência" },
      { id: "valor_total", label: "Valor Total", accessor: (i) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor_total || 0) },
      { id: "pago", label: "Status de Pagamento", accessor: (i) => i.pago ? "Pago" : "Pendente" },
      { id: "data_vencimento", label: "Data de Vencimento" },
    ]
  },
  {
    id: "certificados",
    label: "Certificados Digitais",
    table: "certificados_digitais",
    icon: <Shield size={18} />,
    color: "bg-cyan-500",
    fields: [
      { id: "data_vencimento", label: "Vencimento" },
      { id: "observacao", label: "Observação" },
    ]
  },
  {
    id: "certidoes",
    label: "Certidões Negativas",
    table: "certidoes",
    icon: <FileText size={18} />,
    color: "bg-indigo-500",
    fields: [
      { id: "tipo_certidao", label: "Tipo de Certidão" },
      { id: "vencimento", label: "Vencimento" },
    ]
  },
  {
    id: "licencas",
    label: "Licenças Municipais",
    table: "licencas",
    icon: <AlertCircle size={18} />,
    color: "bg-rose-500",
    fields: [
      { id: "tipo_licenca", label: "Tipo de Licença" },
      { id: "status", label: "Situação" },
      { id: "vencimento", label: "Vencimento" },
      { id: "numero_processo", label: "Processo" },
    ]
  },
  {
    id: "procuracoes",
    label: "Procurações",
    table: "procuracoes",
    icon: <FileText size={18} />,
    color: "bg-orange-500",
    fields: [
      { id: "data_vencimento", label: "Vencimento" },
      { id: "observacao", label: "Observação" },
    ]
  },
  {
    id: "parcelamentos",
    label: "Parcelamentos",
    table: "parcelamentos",
    icon: <Layers size={18} />,
    color: "bg-teal-500",
    fields: [
      { id: "tipo_parcelamento", label: "Tipo" },
      { id: "qtd_parcelas", label: "Parcelas" },
      { id: "data_inicio", label: "Início" },
      { id: "previsao_termino", label: "Término Estimado" },
    ]
  },
  {
    id: "licencas_taxas",
    label: "Taxas de Licenças",
    table: "licencas_taxas",
    icon: <DollarSign size={18} />,
    color: "bg-teal-600",
    fields: [
      { id: "tipo_licenca", label: "Tipo", accessor: (i: any) => licencaLabels[i.tipo_licenca] || i.tipo_licenca },
      { id: "status", label: "Status", accessor: (i: any) => i.status ? i.status.charAt(0).toUpperCase() + i.status.slice(1) : "—" },
      { id: "data_vencimento", label: "Vencimento", accessor: (i: any) => safeFormatDate(i.data_vencimento) },
      { id: "data_envio", label: "Data de Envio", accessor: (i: any) => safeFormatDate(i.data_envio) },
      { id: "forma_envio", label: "Forma de Envio" },
    ]
  },
  {
    id: "recalculos",
    label: "Recálculos",
    table: "recalculos",
    icon: <ListChecks size={18} />,
    color: "bg-lime-500",
    fields: [
      { id: "guia", label: "Guia" },
      { id: "competencia", label: "Competência" },
      { id: "data_recalculo", label: "Data Recálculo" },
      { id: "status", label: "Status" },
    ]
  },
  {
    id: "ocorrencias",
    label: "Ocorrências",
    table: "ocorrencias",
    icon: <AlertCircle size={18} />,
    color: "bg-red-500",
    fields: [
      { id: "data_ocorrencia", label: "Data" },
      { id: "departamento", label: "Departamento" },
      { id: "descricao", label: "Descrição" },
    ]
  },
  {
    id: "agendamentos",
    label: "Agendamentos",
    table: "agendamentos",
    icon: <Calendar size={18} />,
    color: "bg-sky-500",
    fields: [
      { id: "assunto", label: "Assunto" },
      { id: "data", label: "Data" },
      { id: "horario", label: "Horário" },
      { id: "status", label: "Status" },
    ]
  },
  {
    id: "declaracoes_anuais",
    label: "Declarações Anuais",
    table: "declaracoes_anuais",
    icon: <FileText size={18} />,
    color: "bg-violet-500",
    fields: [
      { id: "tipo_declaracao", label: "Tipo" },
      { id: "ano", label: "Ano Base" },
      { id: "enviada", label: "Enviada", accessor: (i) => i.enviada ? "Sim" : "Não" },
    ]
  },
  {
    id: "irpf",
    label: "IRPF",
    table: "irpf",
    icon: <Calculator size={18} />,
    color: "bg-emerald-600",
    fields: [
      { id: "nome_completo", label: "Contribuinte" },
      { id: "cpf", label: "CPF" },
      { id: "empresa", label: "Empresa Vinculada" },
      { id: "ano_exercicio", label: "Ano Base" },
      { id: "valor_a_pagar", label: "Valor a Pagar", accessor: (i) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor_a_pagar || 0) },
      { id: "status_pago", label: "Pagamento", accessor: (i) => i.status_pago ? "Pago" : "Pendente" },
      { id: "data_pagamento", label: "Data de Pgto", accessor: (i) => safeFormatDate(i.data_pagamento) },
      { id: "status_transmissao", label: "Transmissão", accessor: (i) => i.status_transmissao ? i.status_transmissao.charAt(0).toUpperCase() + i.status_transmissao.slice(1) : "Pendente" },
      { id: "data_transmissao", label: "Data Transmissão", accessor: (i) => safeFormatDate(i.data_transmissao) },
      { id: "transmitido_por", label: "Transmitido Por" }
    ]
  },
  {
    id: "declaracoes_mensais",
    label: "Declarações Mensais",
    table: "pessoal",
    icon: <ListChecks size={18} />,
    color: "bg-blue-600",
    fields: [
      { id: "dctf_web_gerada", label: "DCTF Web Gerada", accessor: (i) => i.dctf_web_gerada ? "Sim" : "Não" },
      { id: "dctf_web_data_envio", label: "Data de Envio DCTF", accessor: (i) => safeFormatDate(i.dctf_web_data_envio) },
    ]
  },
  {
    id: "vencimentos",
    label: "Vencimentos (Consolidado)",
    table: "vencimentos_virtual",
    icon: <AlertCircle size={18} />,
    color: "bg-orange-600",
    fields: [
      { id: "tipo", label: "Item" },
      { id: "status", label: "Situação" },
      { id: "data", label: "Vencimento", accessor: (i) => safeFormatDate(i.data) },
      { id: "status_taxa", label: "Status Taxa" },
      { id: "data_envio", label: "Data de Envio" },
      { id: "forma_envio", label: "Forma de Envio" },
      // Virtual field IDs for the UI selector
      { id: "certificados", label: "Certificado Digital" },
      { id: "procuracoes", label: "Procurações" },
      { id: "certidoes", label: "Certidões" },
      { id: "licenca_alvara", label: "Licença: Alvará" },
      { id: "licenca_vigilancia", label: "Licença: Vigilância" },
      { id: "licenca_bombeiros", label: "Licença: Bombeiros" },
      { id: "licenca_meio_ambiente", label: "Licença: Meio Ambiente" },
      { id: "taxa_alvara", label: "Taxa: Alvará" },
      { id: "taxa_vigilancia", label: "Taxa: Vigilância" },
      { id: "taxa_bombeiros", label: "Taxa: Bombeiros" },
      { id: "taxa_meio_ambiente", label: "Taxa: Meio Ambiente" },
    ]
  },
  {
    id: "processos_societarios",
    label: "Processos Societários",
    table: "processos_societarios",
    icon: <History size={18} />,
    color: "bg-indigo-600",
    fields: [
      { id: "tipo", label: "Tipo", accessor: (i: any) => tipoProcessoLabels[i.tipo] || i.tipo },
      { id: "numero_processo", label: "Número" },
      { id: "data_inicio", label: "Início", accessor: (i: any) => safeFormatDate(i.data_inicio) },
      { id: "status", label: "Status", accessor: (i: any) => i.status === 'concluido' ? 'Concluído' : 'Em Andamento' },
      { id: "current_step", label: "Etapa Atual" },
      { id: "foi_deferido", label: "Deferido", accessor: (i: any) => i.foi_deferido ? "Sim" : "Não" },
      { id: "foi_arquivado", label: "Arquivado", accessor: (i: any) => i.foi_arquivado ? "Sim" : "Não" },
      { id: "em_exigencia", label: "Exigência", accessor: (i: any) => i.em_exigencia ? "Sim" : "Não" },
      { id: "exigencia_motivo", label: "Motivo Exigência" },
      { id: "envio_dbe_at", label: "Envio DBE", accessor: (i: any) => safeFormatDate(i.envio_dbe_at) },
      { id: "envio_fcn_at", label: "Envio FCN", accessor: (i: any) => safeFormatDate(i.envio_fcn_at) },
      { id: "envio_contrato_at", label: "Envio Contrato", accessor: (i: any) => safeFormatDate(i.envio_contrato_at) },
      { id: "envio_taxa_at", label: "Envio Taxa", accessor: (i: any) => safeFormatDate(i.envio_taxa_at) },
      { id: "assinatura_contrato_at", label: "Assinatura", accessor: (i: any) => safeFormatDate(i.assinatura_contrato_at) },
      { id: "arquivamento_junta_at", label: "Arquivamento", accessor: (i: any) => safeFormatDate(i.arquivamento_junta_at) },
    ]
  }
];

const SITUATIONS = [
  { id: "ativa", label: "Ativas" },
  { id: "mei", label: "MEI" },
  { id: "paralisada", label: "Paralisadas" },
  { id: "baixada", label: "Baixadas" },
  { id: "entregue", label: "Entregues" }
];

const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy");
  } catch (e) {
    return "—";
  }
};

const RelatorioPersonalizadoPage: React.FC = () => {
  const navigate = useNavigate();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [selectedCompanyFields, setSelectedCompanyFields] = useState<string[]>([]);
  const [selectedSituations, setSelectedSituations] = useState<string[]>(["ativa", "mei", "paralisada", "baixada", "entregue"]);
  const [loadingType, setLoadingType] = useState<'pdf' | 'excel' | null>(null);
  const [headerConfig, setHeaderConfig] = useState<any>(null);

  useEffect(() => {
    fetchHeaderConfig();
  }, []);

  const fetchHeaderConfig = async () => {
    const { data } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();
    if (data?.value) {
       try { setHeaderConfig(JSON.parse(data.value)); } catch (e) { console.error(e); }
    }
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(prev => prev.filter(m => m !== id));
      const newFields = { ...selectedFields };
      delete newFields[id];
      setSelectedFields(newFields);
    } else {
      setSelectedModules(prev => [...prev, id]);
      const mod = MODULES_CONFIG.find(m => m.id === id);
      setSelectedFields(prev => ({ ...prev, [id]: mod?.fields.map(f => f.id) || [] }));
    }
  };

  const toggleField = (modId: string, fieldId: string) => {
    const current = selectedFields[modId] || [];
    if (current.includes(fieldId)) {
      setSelectedFields(prev => ({ ...prev, [modId]: current.filter(f => f !== fieldId) }));
    } else {
      setSelectedFields(prev => ({ ...prev, [modId]: [...current, fieldId] }));
    }
  };

  const toggleSituation = (id: string) => {
    if (selectedSituations.includes(id)) {
      if (selectedSituations.length > 1) {
        setSelectedSituations(prev => prev.filter(s => s !== id));
      } else {
        toast.error("Selecione pelo menos uma situação");
      }
    } else {
      setSelectedSituations(prev => [...prev, id]);
    }
  };

  const generatePDFHeader = async (doc: jsPDF) => {
    doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
    doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
    doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
    doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

    const config = headerConfig || {
       title: "Audipreve Contabilidade",
       subtitle: "CRC-PR nº. 01.0093/O - 6",
       address: "Rua Jequitibá, n.º 789, 1º andar, sala 01, Bairro Nações, Fazenda Rio Grande/PR",
       contact: "Fone: (41) 3604-8059 | societario@audiprevecontabilidade.com.br"
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("Ubuntu", "bold");
    doc.setFontSize(20);
    doc.text(config.title, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("Ubuntu", "normal");
    doc.text(config.subtitle, pageWidth / 2, 26, { align: "center" });
    doc.setFontSize(8);
    doc.text(config.address, pageWidth / 2, 32, { align: "center" });
    doc.text(config.contact, pageWidth / 2, 36, { align: "center" });
    doc.line(10, 40, pageWidth - 10, 40);
  };

  const handleGenerate = async (exportFormat: 'pdf' | 'excel' = 'pdf') => {
    if (selectedModules.length === 0) {
      toast.error("Selecione pelo menos um módulo");
      return;
    }

    setLoadingType(exportFormat);
    try {
      // 1. Fetch All Companies First (Filtered by Situation)
      const situacoesWithoutMei = selectedSituations.filter(s => s !== "mei");
      let query = supabase
        .from("empresas")
        .select("*")
        .order("nome_empresa");

      if (selectedSituations.includes("mei")) {
        if (situacoesWithoutMei.length > 0) {
          query = query.or(`situacao.in.(${situacoesWithoutMei.join(",")}),regime_tributario.eq.mei`);
        } else {
          query = query.eq("regime_tributario", "mei");
        }
      } else {
        query = query.in("situacao", situacoesWithoutMei as any);
      }

      const { data: allCompanies, error: companiesError } = await query;

      if (companiesError) throw companiesError;
      if (!allCompanies || allCompanies.length === 0) {
        toast.error("Nenhuma empresa encontrada para as situações selecionadas.");
        setLoadingType(null);
        return;
      }

      let doc: jsPDF | null = null;
      let pageWidth = 0;
      let currentY = 60;
      const excelAoA: any[][] = []; // Array of Arrays for Excel

      if (exportFormat === 'pdf') {
        doc = new jsPDF({ orientation: 'landscape' });
        await generatePDFHeader(doc);
        pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(14);
        doc.setFont("Ubuntu", "bold");
        doc.text(`RELATÓRIO PERSONALIZADO DO SISTEMA - ${competencia}`, pageWidth / 2, 50, { align: "center" });
      }

      for (const modId of selectedModules) {
        const mod = MODULES_CONFIG.find(m => m.id === modId)!;
        const fieldsToInclude = selectedFields[modId] || [];
        if (fieldsToInclude.length === 0) continue;

        let moduleData: any[] = [];

        // Special case: if it's the societario module, we already have the data
        if (modId === "societario") {
          moduleData = allCompanies;
        } else if (modId === "vencimentos") {
          // Virtual Vencimentos Module Logic
          const calcStatus = (data: string) => { 
            const dias = Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); 
            return dias < 0 ? "Vencido" : dias <= 30 ? "Próximo" : "Em Dia"; 
          };

          const [{ data: licData }, { data: certData }, { data: procData }, { data: certidoesData }, { data: taxasData }] = await Promise.all([
            // Licenses
            fieldsToInclude.some(f => f.startsWith("licenca_")) 
              ? supabase.from("licencas").select("*").eq("status", "com_vencimento").not("vencimento", "is", null)
              : Promise.resolve({ data: [] }),
            // Certificates
            fieldsToInclude.includes("certificados")
              ? supabase.from("certificados_digitais").select("*").not("data_vencimento", "is", null)
              : Promise.resolve({ data: [] }),
            // Proxies
            fieldsToInclude.includes("procuracoes")
              ? supabase.from("procuracoes").select("*").not("data_vencimento", "is", null)
              : Promise.resolve({ data: [] }),
            // Certidaes
            fieldsToInclude.includes("certidoes")
              ? supabase.from("certidoes").select("*").not("vencimento", "is", null)
              : Promise.resolve({ data: [] }),
            // Taxes
            fieldsToInclude.some(f => f.startsWith("taxa_"))
              ? (supabase.from("licencas_taxas" as any).select("*").not("data_vencimento", "is", null) as any)
              : Promise.resolve({ data: [] }),
          ]);

          const compiledVenc: any[] = [];
          
          // Helper maps
          const licMap: Record<string, string> = { alvara: "licenca_alvara", vigilancia_sanitaria: "licenca_vigilancia", corpo_bombeiros: "licenca_bombeiros", meio_ambiente: "licenca_meio_ambiente" };
          const taxaMap: Record<string, string> = { alvara: "taxa_alvara", vigilancia_sanitaria: "taxa_vigilancia", corpo_bombeiros: "taxa_bombeiros", meio_ambiente: "taxa_meio_ambiente" };

          licData?.forEach((l: any) => {
            if (fieldsToInclude.includes(licMap[l.tipo_licenca])) {
              compiledVenc.push({ 
                empresa_id: l.empresa_id, 
                tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`, 
                data: l.vencimento, 
                status: calcStatus(l.vencimento) 
              });
            }
          });
          
          if (fieldsToInclude.includes("certificados")) {
            certData?.forEach((c: any) => compiledVenc.push({ empresa_id: c.empresa_id, tipo: "Certificado Digital", data: c.data_vencimento, status: calcStatus(c.data_vencimento) }));
          }
          
          if (fieldsToInclude.includes("procuracoes")) {
            procData?.forEach((p: any) => compiledVenc.push({ empresa_id: p.empresa_id, tipo: "Procuração", data: p.data_vencimento, status: calcStatus(p.data_vencimento) }));
          }
          
          if (fieldsToInclude.includes("certidoes")) {
            certidoesData?.forEach((c: any) => compiledVenc.push({ empresa_id: c.empresa_id, tipo: `Certidão: ${c.tipo_certidao}`, data: c.vencimento, status: calcStatus(c.vencimento) }));
          }
          
          taxasData?.forEach((t: any) => {
            if (fieldsToInclude.includes(taxaMap[t.tipo_licenca])) {
              compiledVenc.push({ 
                empresa_id: t.empresa_id, 
                tipo: `Taxa: ${licencaLabels[t.tipo_licenca] || t.tipo_licenca}`, 
                data: t.data_vencimento, 
                status: calcStatus(t.data_vencimento),
                // Extra fields for taxes
                status_taxa: t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : "Pendente",
                data_envio: safeFormatDate(t.data_envio),
                forma_envio: t.forma_envio || "—"
              });
            }
          });
          
          moduleData = compiledVenc;
        } else {
          // Fetch Module Data
          let query = supabase.from(mod.table as any).select("*");
          
          if (["fiscal", "pessoal", "declaracoes_mensais", "honorarios", "recalculos", "licencas_taxas", "agendamentos"].includes(modId)) {
             query = query.eq("competencia", competencia);
          } else if (modId === "irpf") {
             const ano = competencia.split('-')[0];
             const { data: irpfClientes } = await supabase.from("irpf").select("*").eq("ano_exercicio", ano);
             const { data: irpfSocios } = await supabase.from("declaracoes_irpf" as any).select(`*, socios(nome, cpf, empresas(nome_empresa))`).eq("ano", ano);
             
             const unified = [];
             if (irpfClientes) {
                irpfClientes.forEach(c => unified.push({
                   categoria: "IRPF Clientes", nome_completo: c.nome_completo, cpf: c.cpf, empresa: "—",
                   ano_exercicio: c.ano_exercicio, valor_a_pagar: c.valor_a_pagar, status_pago: c.status_pago,
                   data_pagamento: c.data_pagamento, status_transmissao: c.status_transmissao, data_transmissao: c.data_transmissao, transmitido_por: c.transmitido_por
                }));
             }
             if (irpfSocios) {
                irpfSocios.forEach((s: any) => unified.push({
                   categoria: "IRPF Clientes Empresa", nome_completo: s.socios?.nome || "—", cpf: s.socios?.cpf || "—", empresa: s.socios?.empresas?.nome_empresa || "—",
                   ano_exercicio: s.ano, valor_a_pagar: null, status_pago: null, data_pagamento: null,
                   status_transmissao: s.transmitida ? "transmitida" : "pendente", data_transmissao: s.data_transmissao, transmitido_por: s.quem_transmitiu
                }));
             }
             moduleData = unified;
          }

          if (modId !== "irpf") {
            const { data, error } = await query;
            if (error) {
              console.error(`Erro ao buscar ${mod.label}:`, error);
            } else {
              moduleData = data || [];
            }
          }
        }

        // Specific Isolated Block for IRPF (Not linked to Companies)
        if (modId === "irpf") {
          const categorias = ["IRPF Clientes", "IRPF Clientes Empresa"];
          
          for (const cat of categorias) {
            const catData = moduleData.filter((d: any) => d.categoria === cat);
            if (catData.length === 0) continue;

            const moduleHeaders = mod.fields.filter(f => fieldsToInclude.includes(f.id)).map(f => f.label);
            const head = [moduleHeaders];

            const body = catData.map((item: any) => [
              ...mod.fields.filter(f => fieldsToInclude.includes(f.id)).map(f => {
                const val = item[f.id];
                if (f.accessor) return f.accessor(item);
                if (val === null || val === undefined) return "—";
                return String(val);
              })
            ]);

            if (exportFormat === 'pdf' && doc) {
              if (currentY > 260) {
                doc.addPage();
                currentY = 20;
              }

              doc.setFontSize(10);
              doc.setFont("Ubuntu", "bold");
              doc.setTextColor(100, 100, 100);
              doc.text(`${cat.toUpperCase()} (${competencia.split('-')[0]})`, 14, currentY + 5);
              currentY += 8;
              doc.setTextColor(0, 0, 0);

              autoTable(doc, {
                startY: currentY,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 12 },
                bodyStyles: { fontSize: 12, cellPadding: 2 },
                styles: { font: 'Ubuntu' },
                margin: { horizontal: 5 },
                didDrawPage: (data) => {
                  currentY = data.cursor?.y || currentY;
                }
              });

              currentY = (doc as any).lastAutoTable.finalY + 10;
            } else if (exportFormat === 'excel') {
              // Write Excel data for IRPF block
              excelAoA.push([]);
              excelAoA.push([`--- IRPF: ${cat.toUpperCase()} (${competencia.split('-')[0]}) ---`]);
              excelAoA.push(head[0]);
              body.forEach(row => excelAoA.push(row));
            }
          }
          
          continue;
        }

        // Special case: Processos Societários without linked company (e.g. Aberturas)
        if (modId === "processos_societarios") {
          const orphanedProcesses = moduleData.filter((d: any) => !d.empresa_id);
          if (orphanedProcesses.length > 0) {
            const fieldsToInclude = selectedFields[modId] || [];
            const activeFields = mod.fields.filter(f => fieldsToInclude.includes(f.id));
            const head = [["Referência", ...activeFields.map(f => f.label)]];
            const body = orphanedProcesses.map(proc => [
              proc.nome_empresa || "—",
              ...activeFields.map(f => {
                if (f.accessor) return f.accessor(proc);
                return proc[f.id] || "—";
              })
            ]);

            if (exportFormat === 'pdf' && doc) {
              if (currentY > 260) { doc.addPage(); currentY = 20; }
              doc.setFontSize(10);
              doc.setFont("Ubuntu", "bold");
              doc.setTextColor(100, 100, 100);
              doc.text("PROCESSOS SEM EMPRESA VINCULADA (NOVAS ABERTURAS)", 14, currentY + 5);
              currentY += 8;
              doc.setTextColor(0, 0, 0);

              autoTable(doc, {
                startY: currentY,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 12 },
                bodyStyles: { fontSize: 12, cellPadding: 2 },
                styles: { font: 'Ubuntu' },
                margin: { horizontal: 5 },
                didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
              });
              currentY = (doc as any).lastAutoTable.finalY + 10;
            } else if (exportFormat === 'excel') {
              excelAoA.push([]);
              excelAoA.push(["--- PROCESSOS SEM EMPRESA VINCULADA ---"]);
              excelAoA.push(head[0]);
              body.forEach(row => excelAoA.push(row));
            }
          }
        }

        // Merge logic: ensure every company is present grouped by situation
        for (const sit of SITUATIONS) {
          if (!selectedSituations.includes(sit.id)) continue;

          const situationCompanies = allCompanies.filter(c => {
             if (sit.id === "mei") return c.regime_tributario === "mei";
             return c.situacao === sit.id && c.regime_tributario !== "mei";
          });

          if (situationCompanies.length === 0) continue;

          const situationRows: any[] = [];
          
          situationCompanies.forEach(company => {
            const companyRecords = moduleData.filter((d: any) => {
              if (modId === "societario") return d.id === company.id;
              return d.empresa_id === company.id;
            });
            
            if (companyRecords.length > 0) {
              companyRecords.forEach(record => {
                situationRows.push({ ...company, ...record, isPartial: false });
              });
            } else {
              // No data for this company in this module, add an empty row
              situationRows.push({ ...company, isPartial: true });
            }
          });

          // Build Table Headers
          const extraHeaders = COMPANY_FIELDS.filter(f => selectedCompanyFields.includes(f.id)).map(f => f.label);
          
          let moduleHeaders: string[] = [];
          let activeFields: ModuleConfig['fields'] = [];
          
          if (modId === "vencimentos") {
            // Adaptive headers for Vencimentos
            const showTaxColumns = fieldsToInclude.some(f => f.startsWith("taxa_"));
            activeFields = [
              { id: "tipo", label: "Item" },
              { id: "status", label: "Situação" },
              { id: "data", label: "Vencimento", accessor: (i) => safeFormatDate(i.data) }
            ];
            
            if (showTaxColumns) {
              activeFields.push(
                { id: "status_taxa", label: "Status Taxa" },
                { id: "data_envio", label: "Data de Envio" },
                { id: "forma_envio", label: "Forma de Envio" }
              );
            }
            moduleHeaders = activeFields.map(f => f.label);
          } else {
            activeFields = mod.fields.filter(f => fieldsToInclude.includes(f.id));
            moduleHeaders = activeFields.map(f => f.label);
          }

          const head = [["Empresa", ...extraHeaders, ...moduleHeaders]];

          // Build Table Body
          const body = situationRows.map(row => {
            const companyValues = COMPANY_FIELDS.filter(f => selectedCompanyFields.includes(f.id)).map(f => {
              if (f.accessor) return f.accessor(row);
              const val = row[f.id];
              if (f.id === "data_abertura" && val) return safeFormatDate(val);
              return val || "—";
            });

            const moduleValues = activeFields.map(f => {
              if (row.isPartial) return "—";
              const val = row[f.id];
              if (f.accessor) return f.accessor(row);
              if (val === null || val === undefined) return "—";
              return String(val);
          });

            return [row.nome_empresa, ...companyValues, ...moduleValues];
          });

          if (exportFormat === 'pdf' && doc) {
            // Situation Sub-header
            if (currentY > 260) {
              doc.addPage();
              currentY = 20;
            }

            doc.setFontSize(10);
            doc.setFont("Ubuntu", "bold");
            doc.setTextColor(100, 100, 100);
            doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
            currentY += 8;
            doc.setTextColor(0, 0, 0);

            autoTable(doc, {
              startY: currentY,
              head: head,
              body: body,
              theme: 'grid',
              headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 12 },
              bodyStyles: { fontSize: 12, cellPadding: 2 },
              styles: { font: 'Ubuntu' },
              margin: { horizontal: 5 },
              didDrawPage: (data) => {
                currentY = data.cursor?.y || currentY;
              }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
          } else if (exportFormat === 'excel') {
            // Write Excel data for this situation
            excelAoA.push([]);
            excelAoA.push([`--- MÓDULO: ${mod.label.toUpperCase()} | SITUAÇÃO: ${sit.label.toUpperCase()} ---`]);
            excelAoA.push(head[0]);
            body.forEach(row => excelAoA.push(row));
          }
        }
      }

      if (exportFormat === 'pdf' && doc) {
        doc.save(`Relatorio_Personalizado_${competencia}.pdf`);
        toast.success("Relatório PDF gerado com sucesso!");
      } else if (exportFormat === 'excel') {
        const ws = XLSX.utils.aoa_to_sheet(excelAoA);
        
        // Auto-fit columns
        const colWidths = excelAoA.reduce((acc: any[], row: any[]) => {
          row.forEach((cell, i) => {
            const cellLen = String(cell || "").length;
            acc[i] = Math.max(acc[i] || 10, cellLen + 2);
          });
          return acc;
        }, []);
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório");
        
        XLSX.writeFile(wb, `Relatorio_Personalizado_${competencia}.xlsx`);
        toast.success("Relatório Excel exportado com sucesso!");
      }

    } catch (error) {
      console.error(error);
      toast.error(`Erro ao gerar ${exportFormat.toUpperCase()}.`);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Area */}
      <div className="bg-card rounded-[2rem] border border-border/50 shadow-sm shadow-primary/5 overflow-hidden">
        <div className="p-8 space-y-8">
          {/* Top Row: Title and Main Config Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-card-foreground tracking-tight">Central de Relatórios</h1>
              <p className="text-muted-foreground text-sm">Configure e exporte documentos personalizados</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end px-4 border-r border-border/50">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status da Seleção</span>
                <span className="text-sm font-bold text-primary">
                  {selectedModules.length} {selectedModules.length === 1 ? "módulo selecionado" : "módulos selecionados"}
                </span>
              </div>

               <div className="flex items-center gap-2">
                 <button
                    onClick={() => handleGenerate('excel')}
                    disabled={loadingType !== null || selectedModules.length === 0}
                    className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-sm ${
                      loadingType !== null || selectedModules.length === 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-surface text-foreground border border-border/50 hover:bg-muted active:scale-95"
                    }`}
                 >
                   {loadingType === 'excel' ? (
                     <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <FileSpreadsheet size={18} className="text-emerald-600" />
                   )}
                   <span>{loadingType === 'excel' ? "Gerando..." : "Excel"}</span>
                 </button>

                 <button
                    onClick={() => handleGenerate('pdf')}
                    disabled={loadingType !== null || selectedModules.length === 0}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${
                      loadingType !== null || selectedModules.length === 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        : "bg-primary text-white shadow-primary/20 hover:scale-105"
                    }`}
                 >
                   {loadingType === 'pdf' ? (
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <Download size={18} />
                   )}
                   <span>{loadingType === 'pdf' ? "Gerando..." : "PDF"}</span>
                 </button>
               </div>
            </div>
          </div>

          {/* Bottom Row: Filters Hub */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/40">
            {/* Filter: Situations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Filter size={14} className="text-primary" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filtrar Empresas por Situação</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {SITUATIONS.map(sit => (
                  <button
                    key={sit.id}
                    onClick={() => toggleSituation(sit.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      selectedSituations.includes(sit.id)
                        ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                        : "bg-background/50 border-border/40 text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    {sit.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Period */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Calendar size={14} className="text-primary" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Período de Referência (Mês/Ano)</span>
              </div>
              <div className="flex items-center w-full max-w-sm">
                <div className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/40 shadow-inner w-full group focus-within:border-primary/40 transition-colors">
                  <input 
                    type="month" 
                    value={competencia} 
                    onChange={(e) => setCompetencia(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold outline-none focus:ring-0 w-full"
                  />
                  <ChevronRight size={16} className="text-muted-foreground/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm overflow-hidden">
             <div className="flex items-center gap-2 mb-6">
               <Layers className="text-primary" size={20} />
               <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Departamentos</h3>
             </div>
             
             <div className="space-y-2">
               {MODULES_CONFIG.map(mod => (
                 <button
                   key={mod.id}
                   onClick={() => toggleModule(mod.id)}
                   className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                     selectedModules.includes(mod.id)
                       ? "border-primary bg-primary/5 shadow-inner"
                       : "border-transparent hover:bg-muted/50 text-muted-foreground"
                   }`}
                 >
                   <div className={`p-2.5 rounded-xl ${selectedModules.includes(mod.id) ? mod.color + " text-white" : "bg-muted text-muted-foreground"}`}>
                     {mod.icon}
                   </div>
                   <span className={`font-bold text-sm flex-1 ${selectedModules.includes(mod.id) ? "text-card-foreground" : ""}`}>
                     {mod.label}
                   </span>
                   {selectedModules.includes(mod.id) && <CheckCircle2 size={18} className="text-primary" />}
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Field Selection Area */}
        <div className="lg:col-span-8 space-y-6">
          {selectedModules.length === 0 ? (
            <div className="bg-card rounded-3xl border border-dashed border-border/60 p-20 flex flex-col items-center justify-center text-center opacity-60">
               <div className="p-6 rounded-full bg-muted mb-4">
                 <ListChecks size={40} className="text-muted-foreground" />
               </div>
               <h3 className="text-xl font-bold text-card-foreground">Nenhum módulo selecionado</h3>
               <p className="text-sm text-muted-foreground max-w-xs mt-2">
                 Selecione um ou mais departamentos ao lado para começar a configurar seu relatório.
               </p>
            </div>
          ) : (
            <div className="space-y-6 animate-scale-in">
              {/* Global Company Sub-panel inside the form */}
              <div className="bg-card rounded-3xl border border-primary/20 shadow-sm p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <h3 className="font-black text-card-foreground text-lg mb-4 flex items-center gap-2 relative z-10">
                  <Building2 size={20} className="text-primary" /> Informações da Empresa
                </h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-md relative z-10">
                  Estes campos serão adicionados como colunas para todos os módulos selecionados abaixo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
                   {COMPANY_FIELDS.map(field => (
                     <button
                       key={field.id}
                       onClick={() => setSelectedCompanyFields(prev => 
                        prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id]
                       )}
                       className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                         selectedCompanyFields.includes(field.id)
                           ? "border-primary/40 bg-primary/5 shadow-sm"
                           : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/20"
                       }`}
                     >
                        <div className={`transition-colors ${selectedCompanyFields.includes(field.id) ? "text-primary" : "text-muted-foreground/40"}`}>
                          {selectedCompanyFields.includes(field.id) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </div>
                        <span className="text-xs font-bold">{field.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              {/* Module Specific Panels */}
              {selectedModules.map(modId => {
                const mod = MODULES_CONFIG.find(m => m.id === modId)!;
                return (
                  <div key={modId} className="bg-card rounded-3xl border border-border/50 shadow-sm">
                    <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${mod.color} text-white`}>
                          {mod.icon}
                        </div>
                        <h3 className="font-black text-card-foreground text-lg">{mod.label}</h3>
                      </div>
                      <button 
                        onClick={() => toggleModule(modId)}
                        className="text-xs font-bold text-destructive hover:opacity-80 px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors self-start sm:self-auto"
                      >
                        Remover módulo
                      </button>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {mod.fields
                          .filter(f => !["tipo", "status", "data", "status_taxa", "data_envio", "forma_envio"].includes(f.id))
                          .map(field => (
                          <button
                            key={field.id}
                            onClick={() => toggleField(modId, field.id)}
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                              selectedFields[modId]?.includes(field.id)
                                ? "border-primary/40 bg-primary/5"
                                : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/20"
                            }`}
                          >
                             <div className={`transition-colors ${selectedFields[modId]?.includes(field.id) ? "text-primary" : "text-muted-foreground/40"}`}>
                               {selectedFields[modId]?.includes(field.id) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                             </div>
                             <span className="text-xs font-bold">{field.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioPersonalizadoPage;
