import React from "react";
import {
  Building2, FileText, Award, Clock, Calculator,
  Users, Receipt, RefreshCw, DollarSign, ClipboardList,
  LayoutDashboard, Shield, Calendar, FileSignature
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  moduleKey?: string;
  section?: string;
}

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, path: "/dashboard", section: "GERAL" },
  { id: "agendamentos", label: "Agendamentos", icon: <Calendar size={18} />, path: "/agendamentos", moduleKey: "agendamentos", section: "GERAL" },
  { id: "tarefas", label: "Tarefas", icon: <ClipboardList size={18} />, path: "/tarefas", moduleKey: "tarefas", section: "GERAL" },
  { id: "ocorrencias", label: "Ocorrências", icon: <FileText size={18} />, path: "/ocorrencias", moduleKey: "ocorrencias", section: "GERAL" },
  { id: "documentos", label: "Assinaturas", icon: <FileSignature size={18} />, path: "/documentos", moduleKey: "documentos", section: "GERAL" },
  { id: "recibos", label: "Recibos", icon: <Receipt size={18} />, path: "/recibos", moduleKey: "recibos", section: "GERAL" },
  { id: "faturamento", label: "Faturamento", icon: <DollarSign size={18} />, path: "/faturamento", moduleKey: "faturamento", section: "GERAL" },
  { id: "societario", label: "Societário", icon: <Building2 size={18} />, path: "/societario", moduleKey: "societario", section: "DEPARTAMENTOS" },
  { id: "fiscal", label: "Fiscal", icon: <Receipt size={18} />, path: "/fiscal", moduleKey: "fiscal" },
  { id: "pessoal", label: "Pessoal", icon: <Users size={18} />, path: "/pessoal", moduleKey: "pessoal" },
  { id: "simulador", label: "Simulador", icon: <Calculator size={18} />, path: "/pessoal/simulador", moduleKey: "simulador", section: "DEPARTAMENTOS" },
  { id: "licencas", label: "Licenças", icon: <Shield size={18} />, path: "/licencas", moduleKey: "licencas", section: "CONTROLES" },
  { id: "declaracoes-mensais", label: "Declarações Mensais", icon: <ClipboardList size={18} />, path: "/declaracoes-mensais", moduleKey: "declaracoes_mensais", section: "CONTROLES" },
  { id: "declaracoes-anuais", label: "Declarações Anuais", icon: <ClipboardList size={18} />, path: "/declaracoes-anuais", moduleKey: "declaracoes_anuais" },
  { id: "irpf", label: "IRPF", icon: <Calculator size={18} />, path: "/irpf", moduleKey: "irpf", section: "CONTROLES" },
  { id: "certificados", label: "Certificados", icon: <Award size={18} />, path: "/certificados", moduleKey: "certificados" },
  { id: "certidoes", label: "Certidões", icon: <FileText size={18} />, path: "/certidoes", moduleKey: "certidoes" },
  { id: "procuracoes", label: "Procurações", icon: <FileText size={18} />, path: "/procuracoes", moduleKey: "procuracoes" },
  { id: "vencimentos", label: "Vencimentos", icon: <Clock size={18} />, path: "/vencimentos", moduleKey: "vencimentos" },
  { id: "parcelamentos", label: "Parcelamentos", icon: <Calculator size={18} />, path: "/parcelamentos", moduleKey: "parcelamentos" },
  { id: "recalculos", label: "Recálculos", icon: <RefreshCw size={18} />, path: "/recalculos", moduleKey: "recalculos" },
  { id: "honorarios", label: "Honorários", icon: <DollarSign size={18} />, path: "/honorarios", moduleKey: "honorarios", section: "FINANCEIRO" },
  { id: "relatorios", label: "Relatórios", icon: <FileText size={18} />, path: "/relatorios", moduleKey: "relatorios" },
];
