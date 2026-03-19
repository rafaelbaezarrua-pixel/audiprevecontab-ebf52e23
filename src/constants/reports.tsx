import React from "react";
import { 
  Building2, Shield, Users, DollarSign, FileText, 
  AlertCircle, Layers, ListChecks, Calendar, History, Calculator
} from "lucide-react";
import { tipoProcessoLabels } from "@/constants/societario";
import { format } from "date-fns";

export interface HeaderConfig {
    logoUrl: string;
    title: string;
    subtitle: string;
    address: string;
    contact: string;
    titleFontSize: number;
    subtitleFontSize: number;
    infoFontSize: number;
    logoWidth: number;
    logoHeight: number;
    logoX: number;
    logoY: number;
}

export const DEFAULT_HEADER: HeaderConfig = {
    logoUrl: "", // Use asset by default if empty
    title: "Audipreve Contabilidade",
    subtitle: "CRC-PR nº. 01.0093/O - 6",
    address: "Rua Jequitibá, n.º 789, 1º andar, sala 01, Bairro Nações, CEP 83823-004,",
    contact: "Fazenda Rio Grande/PR. Fone: (41) 3604-8059 | E-mail: societario@audiprevecontabilidade.com.br",
    titleFontSize: 22,
    subtitleFontSize: 10,
    infoFontSize: 8,
    logoWidth: 20,
    logoHeight: 20,
    logoX: 20,
    logoY: 10
};

export const SITUATIONS = [
  { id: "Ativa", label: "Ativas" },
  { id: "MEI", label: "MEI" },
  { id: "Paralisada", label: "Paralisadas" },
  { id: "Baixada", label: "Baixadas" },
  { id: "Entregue", label: "Entregues" }
];

export const COMPANY_FIELDS = [
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

export interface ModuleField {
  id: string;
  label: string;
  accessor?: (item: any) => any;
}

export interface ModuleConfig {
  id: string;
  label: string;
  table: string;
  icon: React.ReactNode;
  color: string;
  fields: ModuleField[];
}

export const licencaLabels: Record<string, string> = {
  alvara: "Alvará",
  vigilancia_sanitaria: "Vigilância",
  corpo_bombeiros: "Bombeiros",
  meio_ambiente: "Meio Ambiente"
};

export const safeFormatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00"));
    if (isNaN(d.getTime())) return "—";
    return format(d, "dd/MM/yyyy");
  } catch (e) {
    return "—";
  }
};

export const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: "societario",
    label: "Societário (Empresas)",
    table: "empresas",
    icon: <Building2 size={18} />,
    color: "bg-blue-500",
    fields: [
      { id: "situacao", label: "Situação", accessor: (i) => {
          if (i.regime_tributario?.toLowerCase() === 'mei') return "MEI";
          if (!i.situacao) return "—";
          const s = i.situacao.toLowerCase();
          return s.charAt(0).toUpperCase() + s.slice(1);
      } },
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
    table: "controle_irpf",
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
