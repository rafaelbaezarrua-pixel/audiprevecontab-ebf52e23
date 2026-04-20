import React, { useState } from "react";
import { Building2, Eye, Edit2, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Empresa } from "@/types/societario";
import { PaginationState } from "@tanstack/react-table";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";

interface EmpresaTableProps {
  empresas: Empresa[];
  totalCount: number;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  isLoading: boolean;
  onInlineEdit?: (id: string, field: string, value: string | number | boolean) => void;
}

const regimeLabels: Record<string, string> = {
  simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI",
};

const situacaoConfig: Record<string, { label: string; cls: string }> = {
  ativa: { label: "Ativa", cls: "badge-success" },
  paralisada: { label: "Paralisada", cls: "badge-warning" },
  baixada: { label: "Baixada", cls: "badge-danger" },
};

export const EmpresaTable = ({
  empresas,
  totalCount,
  pagination,
  setPagination,
  isLoading,
  onInlineEdit
}: EmpresaTableProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {empresas.map((emp) => {
          const isExpanded = expanded === emp.id;
          const sit = situacaoConfig[emp.situacao || "ativa"] || situacaoConfig.ativa;
          
          let statusColor: "success" | "warning" | "danger" | "info" = "success";
          if (emp.situacao === "paralisada") statusColor = "warning";
          if (emp.situacao === "baixada") statusColor = "danger";

          return (
            <EmpresaAccordion
              key={emp.id}
              icon={<Building2 size={20} />}
              nome_empresa={emp.nome_empresa}
              cnpj={emp.cnpj}
              status={sit.label}
              statusColor={statusColor}
              isOpen={isExpanded}
              onClick={() => setExpanded(isExpanded ? null : emp.id)}
            >
              <div className="max-w-6xl space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Detalhes Técnicos */}
                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-border/10 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/5 pb-2">
                       <Building2 size={14} className="text-primary" />
                       <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Dados Cadastrais</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest opacity-40">Regime Tributário</span>
                        <span className="text-[11px] font-black text-primary uppercase">{regimeLabels[emp.regime_tributario || ""] || "NÃO INFORMADO"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest opacity-40">Quant. de Sócios</span>
                        <span className="text-[11px] font-black text-foreground uppercase">{emp.socios_count || 0} Sócios Registrados</span>
                      </div>
                    </div>
                  </div>

                  {/* Status e ID */}
                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-border/10 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 border-b border-border/5 pb-2">
                       <Hash size={14} className="text-primary" />
                       <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Metadados</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest opacity-40">Identificador Único</span>
                        <span className="text-[11px] font-black text-foreground uppercase font-mono tracking-tighter">{emp.id}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-foreground uppercase tracking-widest opacity-40">Situação Operacional</span>
                        <div className="flex">
                           <span className={`badge-status ${sit.cls} font-black text-[9px] px-2.5 py-0.5 uppercase tracking-widest`}>
                             {sit.label}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-border/10 shadow-inner space-y-6 flex flex-col justify-center">
                    <button 
                      onClick={() => navigate(`/societario/${emp.id}`)}
                      className="w-full h-11 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
                    >
                      <Eye size={16} /> VER DETALHES DA EMPRESA
                    </button>
                    <button 
                      onClick={() => navigate(`/societario/${emp.id}`)}
                      className="w-full h-11 bg-black/10 dark:bg-white/5 border border-border/10 text-foreground rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black/20 transition-all flex items-center justify-center gap-2 shadow-inner"
                    >
                      <Edit2 size={16} /> EDITAR CADASTRO
                    </button>
                  </div>
                </div>
              </div>
            </EmpresaAccordion>
          );
        })}

        {empresas.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 bg-black/[0.02] dark:bg-white/[0.01] rounded-xl border border-dashed border-border/10">
            <Building2 size={32} className="text-muted-foreground/10 mb-4" />
            <p className="text-[12px] font-black text-muted-foreground/30 uppercase tracking-widest">Nenhuma empresa encontrada</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-black/5 dark:bg-white/5 border border-border/10 rounded-2xl shadow-inner">
        <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
            MOSTRANDO <span className="text-primary">{empresas.length}</span> DE <span className="text-primary">{totalCount}</span> REGISTROS
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1.5 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                PÁGINA <span className="text-primary text-[13px] tabular-nums">{pagination.pageIndex + 1}</span>
                <span className="opacity-20">/ de</span> {Math.ceil(totalCount / pagination.pageSize) || 1}
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-border/10 shadow-inner">
              <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground hover:text-primary hover:bg-card disabled:opacity-10 transition-all active:scale-90"
                  onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
                  disabled={pagination.pageIndex === 0}
              >
                  <ChevronLeft size={18} />
              </button>
              <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground hover:text-primary hover:bg-card disabled:opacity-10 transition-all active:scale-90"
                  onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                  disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
              >
                  <ChevronRight size={18} />
              </button>
            </div>
            
            <select
               value={pagination.pageSize}
               onChange={e => setPagination(prev => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }))}
               className="h-11 px-4 rounded-xl border border-border/10 bg-black/10 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest shadow-inner outline-none cursor-pointer hover:bg-black/20 transition-all"
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} POR PÁGINA
                </option>
              ))}
            </select>
        </div>
      </div>
    </div>
  );
};
