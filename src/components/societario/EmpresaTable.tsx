import React, { useState } from "react";
import { Building2, Eye, Edit2, ChevronLeft, ChevronRight, Hash, MapPin, Users } from "lucide-react";
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
              <div className="max-w-7xl animate-in fade-in slide-in-from-top-2 duration-300">
                {/* Header de Ações Integrado */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70">Cadastro Completo da Empresa</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/societario/${emp.id}`)}
                      className="h-8 px-4 bg-black/10 dark:bg-white/5 border border-border/10 text-foreground hover:text-primary hover:border-primary/30 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-inner group"
                    >
                      <Eye size={12} className="opacity-40 group-hover:opacity-100" />
                      VER DETALHES
                    </button>
                    <button
                      onClick={() => navigate(`/societario/${emp.id}`)}
                      className="h-8 px-4 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
                    >
                      <Edit2 size={12} />
                      EDITAR CADASTRO
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Seção 1: Dados Gerais */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 opacity-30">
                      <Building2 size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Informações Gerais</span>
                    </div>
                    <div className="space-y-4 pl-5 border-l border-border/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Nome Fantasia</span>
                        <span className="text-[10px] font-black text-foreground uppercase truncate">{emp.nome_fantasia || "N/A"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Data de Abertura</span>
                        <span className="text-[10px] font-black text-foreground font-mono">{emp.data_abertura ? new Date(emp.data_abertura).toLocaleDateString('pt-BR') : "N/D"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Natureza Jurídica</span>
                        <span className="text-[10px] font-black text-foreground uppercase leading-tight line-clamp-2">{emp.natureza_juridica || "NÃO INFORMADA"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Tributário e CNAE */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 opacity-30">
                      <Hash size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Fiscal / Atividades</span>
                    </div>
                    <div className="space-y-4 pl-5 border-l border-border/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Regime Tributário</span>
                        <span className="text-[10px] font-black text-primary uppercase">{regimeLabels[emp.regime_tributario || ""] || "NÃO DEFINIDO"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">CNAE Principal</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-foreground font-mono">{emp.cnae_fiscal || "N/A"}</span>
                          <span className="text-[8px] font-bold text-muted-foreground/60 leading-tight line-clamp-2 uppercase mt-0.5">{emp.cnae_fiscal_descricao}</span>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Optante Simples</span>
                          <span className={`text-[9px] font-black ${emp.opcao_pelo_simples ? 'text-emerald-500' : 'text-rose-500'}`}>{emp.opcao_pelo_simples ? 'SIM' : 'NÃO'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">MEI</span>
                          <span className={`text-[9px] font-black ${emp.opcao_pelo_mei ? 'text-emerald-500' : 'text-rose-500'}`}>{emp.opcao_pelo_mei ? 'SIM' : 'NÃO'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Localização e Contato */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 opacity-30">
                      <MapPin size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Localização e Contato</span>
                    </div>
                    <div className="space-y-4 pl-5 border-l border-border/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Endereço Principal</span>
                        <span className="text-[9px] font-black text-foreground uppercase leading-tight line-clamp-3">
                          {emp.endereco ? (
                            `${emp.endereco.logradouro}, ${emp.endereco.numero}${emp.endereco.complemento ? ' - ' + emp.endereco.complemento : ''}, ${emp.endereco.bairro}, ${emp.endereco.cidade}/${emp.endereco.estado}`
                          ) : "ENDEREÇO NÃO CADASTRADO"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Email Receita</span>
                        <span className="text-[10px] font-black text-foreground lowercase truncate">{emp.email_rfb || "N/A"}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Telefone Comercial</span>
                        <span className="text-[10px] font-black text-foreground font-mono">{emp.telefone_rfb || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seção 4: Capital e Estrutura */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 opacity-30">
                      <Users size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Capital Social</span>
                    </div>
                    <div className="space-y-4 pl-5 border-l border-border/10">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Capital Social</span>
                        <span className="text-[12px] font-black text-emerald-500 font-mono">
                          {emp.capital_social ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(emp.capital_social) : "R$ 0,00"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Sócios Registrados</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-foreground">{emp.socios_count || 0}</span>
                          <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Sócios</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-tighter">Porte da Empresa</span>
                        <span className="text-[10px] font-black text-foreground uppercase">{emp.porte_empresa || "N/A"}</span>
                      </div>
                    </div>
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
