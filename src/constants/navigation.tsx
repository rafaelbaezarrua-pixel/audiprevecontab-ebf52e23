// src/constants/navigation.tsx
// ARQUIVO MODIFICADO — adicione o item "gerenciador_arquivos" na lista abaixo

import React from "react";
import {
  Building2, FileText, Award, Clock, Calculator,
  Users, Receipt, RefreshCw, DollarSign, ClipboardList,
  LayoutDashboard, Shield, Calendar, FileSignature,
  Database, Settings, Bell,
  HardDrive,   // ← NOVO ícone adicionado
} from "lucide-react";

export interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  moduleKey?: string;
  section?: string;
  color?: string;
}

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  // GERAL
  { id: "agendamentos", label: "Agendamentos", icon: <Calendar size={18} />, path: "/agendamentos", moduleKey: "agendamentos", section: "GERAL" },
  { id: "dashboard",    label: "Dashboard",    icon: <LayoutDashboard size={18} />, path: "/dashboard", section: "GERAL" },
  { id: "irpf",         label: "IRPF",         icon: <Calculator size={18} />, path: "/irpf", moduleKey: "irpf", section: "GERAL" },
  { id: "ocorrencias",  label: "Ocorrências",  icon: <FileText size={18} />, path: "/ocorrencias", moduleKey: "ocorrencias", section: "GERAL" },
  { id: "recalculos",   label: "Recálculos",   icon: <RefreshCw size={18} />, path: "/recalculos", moduleKey: "recalculos", section: "GERAL" },
  { id: "recibos",      label: "Recibos",      icon: <Receipt size={18} />, path: "/recibos", moduleKey: "recibos", section: "GERAL" },
  { id: "relatorios",   label: "Relatórios",   icon: <FileText size={18} />, path: "/relatorios", moduleKey: "relatorios", section: "GERAL" },
  { id: "tarefas",      label: "Tarefas",      icon: <ClipboardList size={18} />, path: "/tarefas", moduleKey: "tarefas", section: "GERAL" },

  // DEPARTAMENTOS
  { id: "contabil",    label: "Contábil",    icon: <Calculator size={18} />, path: "/contabil",   moduleKey: "contabil",   section: "DEPARTAMENTOS" },
  { id: "fiscal",      label: "Fiscal",      icon: <Receipt size={18} />,    path: "/fiscal",     moduleKey: "fiscal",     section: "DEPARTAMENTOS" },
  { id: "honorarios",  label: "Financeiro",  icon: <DollarSign size={18} />, path: "/honorarios", moduleKey: "honorarios", section: "DEPARTAMENTOS" },
  { id: "pessoal",     label: "Pessoal",     icon: <Users size={18} />,      path: "/pessoal",    moduleKey: "pessoal",    section: "DEPARTAMENTOS" },
  { id: "societario",  label: "Societário",  icon: <Building2 size={18} />,  path: "/societario", moduleKey: "societario", section: "DEPARTAMENTOS" },

  // CONTROLES
  { id: "documentos",         label: "Assinaturas",        icon: <FileSignature size={18} />,  path: "/documentos",         moduleKey: "documentos",         section: "CONTROLES" },
  { id: "certidoes",          label: "Certidões",          icon: <FileText size={18} />,       path: "/certidoes",          moduleKey: "certidoes",          section: "CONTROLES" },
  { id: "certificados",       label: "Certificados",       icon: <Award size={18} />,          path: "/certificados",       moduleKey: "certificados",       section: "CONTROLES" },
  { id: "declaracoes-anuais", label: "Declarações Anuais", icon: <ClipboardList size={18} />,  path: "/declaracoes-anuais", moduleKey: "declaracoes_anuais", section: "CONTROLES" },
  { id: "declaracoes-mensais",label: "Declarações Mensais",icon: <ClipboardList size={18} />,  path: "/declaracoes-mensais",moduleKey: "declaracoes_mensais",section: "CONTROLES" },
  { id: "faturamento",        label: "Faturamento",        icon: <DollarSign size={18} />,     path: "/faturamento",        moduleKey: "faturamento",        section: "CONTROLES" },

  // ─── NOVO ITEM ──────────────────────────────────────────────────────────────
  {
    id: "gerenciador_arquivos",
    label: "Arquivos",
    icon: <HardDrive size={18} />,
    path: "/arquivos",
    moduleKey: "gerenciador_arquivos",
    section: "CONTROLES",
    color: "#0ea5e9",  // azul céu — personalize se quiser
  },
  // ────────────────────────────────────────────────────────────────────────────

  { id: "licencas",      label: "Licenças",      icon: <Shield size={18} />,     path: "/licencas",      moduleKey: "licencas",      section: "CONTROLES" },
  { id: "parcelamentos", label: "Parcelamentos",  icon: <Calculator size={18} />, path: "/parcelamentos", moduleKey: "parcelamentos", section: "CONTROLES" },
  { id: "procuracoes",   label: "Procurações",    icon: <FileText size={18} />,   path: "/procuracoes",   moduleKey: "procuracoes",   section: "CONTROLES" },
  { id: "simulador",     label: "Simulador",      icon: <Calculator size={18} />, path: "/pessoal/simulador", moduleKey: "simulador", section: "CONTROLES" },
  { id: "vencimentos",   label: "Vencimentos",    icon: <Clock size={18} />,      path: "/vencimentos",   moduleKey: "vencimentos",   section: "CONTROLES" },

  // CONTABILIDADE (Admin)
  { id: "auditoria",      label: "Auditoria",        icon: <Database size={18} />, path: "/configuracoes/auditoria", moduleKey: "admin", section: "CONTABILIDADE" },
  { id: "configuracoes",  label: "Configurações",    icon: <Settings size={18} />, path: "/configuracoes",           moduleKey: "admin", section: "CONTABILIDADE" },
  { id: "gestor_alertas", label: "Gestor de Alertas",icon: <Bell size={18} />,    path: "/configuracoes/alertas",   moduleKey: "admin", section: "CONTABILIDADE" },
];
