import React from "react";
import { formatDateBR, formatMonthYearBR } from "@/lib/utils";
import { Building2, ChevronDown, ChevronUp, Plus, Clock, FolderOpen } from "lucide-react";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Empresa } from "@/types/societario";
import { HonorarioConfig, HonorarioMensal } from "@/types/honorarios";
import { HonorarioConfigForm } from "./HonorarioConfigForm";
import { HonorarioMensalForm } from "./HonorarioMensalForm";
import { EmpresaAccordion } from "@/components/EmpresaAccordion";

interface HonorariosEmpresasViewProps {
  empresas: Empresa[];
  expanded: string | null;
  onToggleExpand: (id: string) => void;
  activeTabs: Record<string, "mensal" | "configuracao" | "pastas">;
  setActiveTab: (id: string, tab: "mensal" | "configuracao" | "pastas") => void;
  configs: Record<string, Partial<HonorarioConfig>>;
  configForms: Record<string, Partial<HonorarioConfig>>;
  onUpdateConfigField: (id: string, field: string, value: string | number | boolean) => void;
  onAddOutroServico: (id: string) => void;
  onUpdateOutroServico: (id: string, idx: number, field: string, value: string | number) => void;
  onRemoveOutroServico: (id: string, idx: number) => void;
  onSaveConfig: (id: string) => void;
  mensalData: Record<string, HonorarioMensal[]>;
  mensalForms: Record<string, HonorarioMensal>;
  onUpdateMensalField: (id: string, field: string, value: string | number | boolean) => void;
  onSaveMensal: (id: string) => void;
  onGenerateMonth: (id: string) => void;
  onStartEditMensal: (id: string, record: HonorarioMensal) => void;
  competenciaSelecionada: Record<string, string>;
  setCompetenciaSelecionada: (id: string, value: string) => void;
  onCancelMensalForm: (id: string) => void;
  pagination: { pageIndex: number; pageSize: number };
  onPageChange: (page: number) => void;
  totalCount: number;
  loading: boolean;
  onUpdateMensalValor: (id: string, recordId: string, newValue: number) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorariosEmpresasView = ({
  empresas, expanded, onToggleExpand, activeTabs, setActiveTab,
  configs, configForms, onUpdateConfigField, onAddOutroServico, onUpdateOutroServico, onRemoveOutroServico, onSaveConfig,
  mensalData, mensalForms, onUpdateMensalField, onSaveMensal, onGenerateMonth, onStartEditMensal,
  competenciaSelecionada, setCompetenciaSelecionada, onCancelMensalForm,
  pagination, onPageChange, totalCount, loading, onUpdateMensalValor
}: HonorariosEmpresasViewProps) => {
  const [editingRecordId, setEditingRecordId] = React.useState<string | null>(null);
  const [editVal, setEditVal] = React.useState<string>("");

  const handleStartEdit = (record: HonorarioMensal) => {
    setEditingRecordId(record.id || null);
    setEditVal(String(record.valor_total || 0));
  };

  const handleSave = (empId: string) => {
    if (editingRecordId) {
      const val = parseFloat(editVal.replace(",", "."));
      if (!isNaN(val)) {
        onUpdateMensalValor(empId, editingRecordId, val);
      }
    }
    setEditingRecordId(null);
  };
  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-4">
      {loading && empresas.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg shadow-primary/20" />
        </div>
      )}

      {!loading && empresas.length === 0 && (
        <div className="text-center py-20 bg-black/[0.02] dark:bg-white/[0.01] rounded-2xl border border-dashed border-border/10">
          <Clock size={32} className="text-muted-foreground/10 mx-auto mb-4" />
          <p className="text-[12px] font-black uppercase text-muted-foreground/30 tracking-[0.2em] italic">Nenhuma empresa encontrada</p>
        </div>
      )}

      <div className="space-y-3">
        {empresas.map(emp => {
          const isOpen = expanded === emp.id;
          const tab = activeTabs[emp.id] || "mensal";
          const mForm = mensalForms[emp.id];
          const hasMensalRecords = mensalData[emp.id] && mensalData[emp.id].length > 0;
          const config = configs[emp.id];
          
          const valorBase = config?.valor_honorario || 0;
          const statusText = valorBase > 0 ? formatCurrency(valorBase) : "Não Configurado";
          const statusColor = valorBase > 0 ? "success" : "warning";

          return (
            <EmpresaAccordion
              key={emp.id}
              icon={<Clock size={20} />}
              nome_empresa={emp.nome_empresa}
              cnpj={emp.cnpj}
              status={statusText}
              statusColor={statusColor}
              isOpen={isOpen}
              onClick={() => onToggleExpand(emp.id)}
            >
              <div className="max-w-6xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 border-b border-border/5 items-center justify-between px-4 -mx-4 -mt-4 mb-4 rounded-t-2xl">
                  <div className="flex gap-1.5 h-10 items-center bg-black/10 dark:bg-white/5 p-1 rounded-xl shadow-inner">
                    {[
                      { id: "mensal", label: "Fechamentos" },
                      { id: "configuracao", label: "Contrato" },
                      { id: "pastas", label: "Arquivos", icon: FolderOpen }
                    ].map(t => (
                      <button 
                        key={t.id}
                        className={`h-full px-5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center ${tab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`} 
                        onClick={() => setActiveTab(emp.id, t.id as any)}
                      >
                        {t.icon && <t.icon size={12} />}
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] italic">ID: {emp.id.slice(0,10).toUpperCase()}</span>
                  </div>
                </div>

                <div className="bg-transparent outline-none min-h-[300px]">
                  {tab === "configuracao" && (
                    <div className="animate-in slide-in-from-top-1 duration-200">
                      <HonorarioConfigForm 
                        config={configForms[emp.id] || {}}
                        onUpdateField={(f, v) => onUpdateConfigField(emp.id, f, v)}
                        onAddOutroServico={() => onAddOutroServico(emp.id)}
                        onUpdateOutroServico={(idx, f, v) => onUpdateOutroServico(emp.id, idx, f, v)}
                        onRemoveOutroServico={(idx) => onRemoveOutroServico(emp.id, idx)}
                        onSave={() => onSaveConfig(emp.id)}
                      />
                    </div>
                  )}

                  {tab === "mensal" && (
                    <div className="space-y-6">
                      {!mForm && (
                        <div className="flex flex-col sm:flex-row items-end gap-3 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-border/10 shadow-inner">
                          <div className="flex-1 w-full space-y-2">
                            <label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1 opacity-50 italic">Gerar Novo Honorário</label>
                            <input 
                              type="month" 
                              value={competenciaSelecionada[emp.id] || ""} 
                              onChange={e => setCompetenciaSelecionada(emp.id, e.target.value)} 
                              className="w-full h-10 px-4 rounded-xl border border-border/10 bg-card text-[12px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-sm" 
                            />
                          </div>
                          <button onClick={() => onGenerateMonth(emp.id)} className="w-full sm:w-auto h-10 px-8 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 group">
                            <Plus size={16} className="group-hover:rotate-90 transition-transform" /> GERAR LANÇAMENTO
                          </button>
                        </div>
                      )}

                      {mForm && (
                        <div className="animate-in slide-in-from-top-1 duration-200">
                          <HonorarioMensalForm 
                            form={mForm}
                            onUpdateField={(f, v) => onUpdateMensalField(emp.id, f, v)}
                            onCancel={() => onCancelMensalForm(emp.id)}
                            onSave={() => onSaveMensal(emp.id)}
                          />
                        </div>
                      )}

                      {hasMensalRecords && !mForm && (
                        <div className="module-card !p-0 overflow-hidden shadow-inner bg-black/[0.01]">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-black/5 dark:bg-white/5 border-b border-border/10">
                                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 italic">Competência</th>
                                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 italic">Valor Total</th>
                                <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 italic">Vencimento</th>
                                <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 italic">Status / Pagamento</th>
                                <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em] text-foreground/40 italic pr-8 w-20">...</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                              {mensalData[emp.id].map((record: HonorarioMensal) => (
                                <tr key={record.id} className="hover:bg-primary/[0.03] transition-colors group/row">
                                  <td className="px-5 py-3 font-black text-foreground text-[11px] uppercase tracking-tight">{formatMonthYearBR(record.competencia)}</td>
                                  <td className="px-5 py-3" onDoubleClick={() => handleStartEdit(record)}>
                                    {editingRecordId === record.id ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        className="w-28 h-9 px-3 text-right border border-primary/50 rounded-lg bg-card outline-none text-[12px] font-black text-primary shadow-inner"
                                        value={editVal}
                                        onChange={(e) => setEditVal(e.target.value)}
                                        onBlur={() => handleSave(emp.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSave(emp.id);
                                          if (e.key === "Escape") setEditingRecordId(null);
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2 group/val">
                                        <span className="text-[12px] font-black text-primary tracking-tighter transition-all group-hover/val:scale-110">{formatCurrency(record.valor_total)}</span>
                                        <div className="opacity-0 group-hover/row:opacity-20 transition-opacity">
                                          <Plus size={10} className="rotate-45" /> 
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-foreground font-mono text-[10px] font-black opacity-40">{formatDateBR(record.data_vencimento)}</td>
                                  <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${record.status === "enviada" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" : record.status === "gerada" ? "bg-primary/10 text-primary border-primary/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}`}>
                                        {record.status}
                                      </span>
                                      {record.pago ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black border bg-emerald-500/20 text-emerald-500 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]">PAGO</span>
                                      ) : (
                                        <span className="px-2.5 py-1 rounded-lg text-[9px] font-black border border-border/10 text-foreground/20 uppercase italic">ABERTO</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-right pr-8">
                                    <button onClick={() => onStartEditMensal(emp.id, record)} className="h-8 px-4 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-lg transition-all shadow-sm">Configurar</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === "pastas" && (
                     <div className="animate-in slide-in-from-right-1 duration-200 h-[380px] bg-black/5 dark:bg-white/5 rounded-2xl border border-dashed border-border/10 p-0.5 overflow-hidden shadow-inner">
                       <ModuleFolderView empresa={emp} departamentoId="financeiro" />
                     </div>
                  )}
                </div>
              </div>
            </EmpresaAccordion>
          );
        })}
      </div>

      {totalCount > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 p-4 bg-black/5 dark:bg-white/5 border border-border/10 rounded-2xl shadow-inner">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">
            EXIBINDO REGISTROS {pagination.pageIndex * pagination.pageSize + 1} ATÉ {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} DE {totalCount} TOTAIS
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, pagination.pageIndex - 1))}
              disabled={pagination.pageIndex === 0 || loading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border/10 text-foreground hover:text-primary transition-all disabled:opacity-20 shadow-sm active:scale-90"
            >
              <ChevronDown size={18} className="rotate-90" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
               {(() => {
                 const totalPages = Math.ceil(totalCount / pagination.pageSize);
                 const current = pagination.pageIndex;
                 const start = Math.max(0, Math.min(current - 2, totalPages - 5));
                 const end = Math.min(totalPages, start + 5);
                 
                 return Array.from({ length: end - start }).map((_, i) => {
                    const pageIdx = start + i;
                    return (
                    <button
                      key={pageIdx}
                      onClick={() => onPageChange(pageIdx)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all ${pagination.pageIndex === pageIdx ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10" : "text-muted-foreground/30 hover:text-foreground hover:bg-black/5 font-mono"}`}
                    >
                      {String(pageIdx + 1).padStart(2, '0')}
                    </button>
                    );
                 });
               })()}
            </div>
            <button
              onClick={() => onPageChange(pagination.pageIndex + 1)}
              disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount || loading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-card border border-border/10 text-foreground hover:text-primary transition-all disabled:opacity-20 shadow-sm active:scale-90"
            >
              <ChevronDown size={18} className="-rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HonorariosEmpresasView;
