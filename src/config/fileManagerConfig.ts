// ─────────────────────────────────────────────────────────────────────────────
// src/config/fileManagerConfig.ts
// Configuração de departamentos para o gerenciador de arquivos
// ─────────────────────────────────────────────────────────────────────────────

export interface Departamento {
  id: string;
  label: string;
  folderName: string; // nome exato da pasta no servidor
  icon: string;
  moduleKey?: string; // chave do módulo no sistema (para filtrar por acesso)
}

// Departamentos padrão para cada empresa.
// O nome da pasta no servidor deve seguir exatamente o "folderName".
// Estrutura esperada: /<NomePastaEmpresa>/<folderName>/
export const DEPARTAMENTOS: Departamento[] = [
  { id: "geral", label: "Geral", folderName: "Geral", icon: "📁" },
  { id: "contabil", label: "Contabilidade", folderName: "Contabilidade", icon: "📊", moduleKey: "contabil" },
  { id: "fiscal", label: "Fiscal", folderName: "Fiscal", icon: "🧾", moduleKey: "fiscal" },
  { id: "pessoal", label: "Pessoal", folderName: "Pessoal", icon: "👥", moduleKey: "pessoal" },
  { id: "societario", label: "Societário", folderName: "Societario", icon: "🏢", moduleKey: "societario" },
  { id: "financeiro", label: "Financeiro", folderName: "Financeiro", icon: "💰", moduleKey: "honorarios" },
  { id: "irpf", label: "IRPF", folderName: "IRPF", icon: "📋", moduleKey: "irpf" },
  { id: "certidoes", label: "Certidões", folderName: "Certidoes", icon: "🏅", moduleKey: "certidoes" },
  { id: "contratos", label: "Contratos e Docs", folderName: "Contratos", icon: "📝" },
];

// Pasta raiz no servidor onde ficam as empresas
// Altere para o caminho real configurado no FileBrowser
// Exemplo: se o root do FileBrowser aponta para C:\OneDrive\Escritorio,
// e as empresas ficam em C:\OneDrive\Escritorio\Empresas, use "/Empresas"
export const EMPRESAS_ROOT = "/CLIENTES AUDIPREVE";

// Função helper: retorna o path no servidor para uma empresa + departamento
export function buildPath(
  empresaFolderName: string,
  departamento?: Departamento
): string {
  const base = `${EMPRESAS_ROOT}/${empresaFolderName}`;
  if (!departamento || departamento.id === "geral") return base;
  return `${base}/${departamento.folderName}`;
}

// Tipos de arquivo para ícones
export const FILE_TYPE_MAP: Record<string, string[]> = {
  pdf: [".pdf"],
  word: [".doc", ".docx"],
  excel: [".xls", ".xlsx", ".csv"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  text: [".txt", ".md"],
  zip: [".zip", ".rar", ".7z", ".tar", ".gz"],
  video: [".mp4", ".mov", ".avi", ".mkv"],
};

export function getFileIcon(isDir: boolean, extension: string): string {
  if (isDir) return "📁";
  const ext = extension.toLowerCase();
  for (const [type, exts] of Object.entries(FILE_TYPE_MAP)) {
    if (exts.includes(ext)) {
      const icons: Record<string, string> = {
        pdf: "📄", word: "📝", excel: "📊", image: "🖼️",
        text: "📃", zip: "🗜️", video: "🎬",
      };
      return icons[type] ?? "📎";
    }
  }
  return "📎";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

import { formatDateBR } from "@/lib/utils";

export function formatDate(iso: string): string {
  return formatDateBR(iso);
}