import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
}

export function maskCPF(value: string) {
  if (!value) return "";
  if (value.includes("*")) return value; // Mantém versão mascarada da RFB
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
    .substring(0, 14);
}

export function maskCPFCNPJ(value: string) {
  if (!value) return "";
  if (value.includes("*")) return value;
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 11) return maskCPF(clean);
  return maskCNPJ(clean);
}

export function formatCurrency(value: number | string) {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numericValue || 0);
}

/**
 * Formata uma data para o padrão brasileiro (dd/mm/aaaa)
 */
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" 
      ? new Date(date + (date.includes("T") ? "" : "T12:00:00")) 
      : date;
    
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR").format(d);
  } catch (e) {
    return "—";
  }
}

/**
 * Formata uma competência (YYYY-MM) para o padrão brasileiro (MM/YYYY)
 */
export function formatMonthYearBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  if (typeof dateStr !== 'string') return "—";
  
  // Se já estiver no formato brasileiro ou similar, retorna como está ou tenta tratar
  if (dateStr.includes("/")) return dateStr;
  
  const parts = dateStr.split("-");
  if (parts.length === 2) {
    // YYYY-MM
    const [year, month] = parts;
    return `${month}/${year}`;
  }
  
  if (parts.length === 3) {
    // YYYY-MM-DD
    const [year, month] = parts;
    return `${month}/${year}`;
  }

  return dateStr;
}
