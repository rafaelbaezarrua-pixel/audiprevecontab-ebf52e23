
import React from "react";
import { Building2, ChevronDown, ChevronUp, Plus, Clock, FolderOpen } from "lucide-react";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Empresa } from "@/types/societario";
import { HonorarioConfig, HonorarioMensal } from "@/types/honorarios";
import { HonorarioConfigForm } from "./HonorarioConfigForm";
import { HonorarioMensalForm } from "./HonorarioMensalForm";

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
    <div className="space-y-2">
      {loading && empresas.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && empresas.length === 0 && (
        <div className="text-center py-12 module-card bg-black/5">
          <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest">Nenhuma empresa encontrada com estes critérios.</p>
        </div>
      )}

      {empresas.map(emp => {
        const isOpen = expanded === emp.id;
        const tab = activeTabs[emp.id] || "mensal";
        const mForm = mensalForms[emp.id];
        const hasMensalRecords = mensalData[emp.id] && mensalData[emp.id].length > 0;

        return (
          <div key={emp.id} className={`module-card !p-0 overflow-hidden border-border/10 transition-all ${isOpen ? "ring-1 ring-primary/20 bg-primary/[0.02]" : ""}`}>
            <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-primary/[0.04] transition-all group" onClick={() => onToggleExpand(emp.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-black/5 dark:bg-white/5 border border-border/5 text-primary group-hover:bg-primary/10"}`}>
                  <Building2 size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-foreground text-[11px] uppercase tracking-tight group-hover:text-primary transition-colors">{emp.nome_empresa}</span>
                  <span className="text-[8px] text-muted-foreground/40 font-black uppercase tracking-widest opacity-60 font-mono italic">{emp.cnpj || "—"}</span>
                </div>
              </div>
              <div className={`p-1 rounded-lg transition-all ${isOpen ? "rotate-180 text-primary" : "text-muted-foreground/20"}`}>
                <ChevronDown size={14} />
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-border/10 animate-fade-in">
                <div className="flex bg-black/5 dark:bg-white/5 p-1 border-b border-border/5 items-center justify-between px-4">
                  <div className="flex gap-1 h-8 items-center bg-black/10 dark:bg-white/10 p-1 rounded-lg shadow-inner">
                    {[
                      { id: "mensal", label: "Histórico" },
                      { id: "configuracao", label: "Config" },
                      { id: "pastas", label: "Arquivos", icon: FolderOpen }
                    ].map(t => (
                      <button 
                        key={t.id}
                        className={`h-full px-4 rounded-md text-[8px] font-black uppercase tracking-widest transition-all gap-1.5 flex items-center ${tab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`} 
                        onClick={() => setActiveTab(emp.id, t.id as any)}
                      >
                        {t.icon && <t.icon size={10} />}
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">ID: {emp.id.slice(0,8).toUpperCase()}</span>
                  </div>
                </div>

                <div className="p-4 bg-transparent outline-none">
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
                    <div className="space-y-4">
                      {!mForm && (
                        <div className="flex flex-col sm:flex-row items-end gap-2.5 bg-black/10 dark:bg-white/5 p-3 rounded-xl border border-border/10 shadow-inner">
                          <div className="flex-1 w-full space-y-1">
                            <label className="text-[7px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Nova Competência</label>
                            <input 
                              type="month" 
                              value={competenciaSelecionada[emp.id] || ""} 
                              onChange={e => setCompetenciaSelecionada(emp.id, e.target.value)} 
                              className="w-full h-9 px-3 rounded-lg border border-border/10 bg-card text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all shadow-inner" 
                            />
                          </div>
                          <button onClick={() => onGenerateMonth(emp.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 h-9 px-6 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border border-primary/20">
                            <Plus size={14} /> Gerar Mês
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
                        <div className="overflow-hidden rounded-xl border border-border/10 shadow-sm">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-black/5 dark:bg-white/5 border-b border-border/10">
                                <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Competência</th>
                                <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Valor Total</th>
                                <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Vencimento</th>
                                <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Status / Pagamento</th>
                                <th className="px-4 py-2 text-right text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                              {mensalData[emp.id].map((record: HonorarioMensal) => (
                                <tr key={record.id} className="hover:bg-primary/[0.02] transition-colors group/row">
                                  <td className="px-4 py-2 font-black text-foreground text-[10px] uppercase">{record.competencia}</td>
                                  <td className="px-4 py-2" onDoubleClick={() => handleStartEdit(record)}>
                                    {editingRecordId === record.id ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        className="w-24 h-7 px-2 text-right border border-primary/50 rounded-md bg-black/10 outline-none text-[10px] font-black text-primary shadow-inner"
                                        value={editVal}
                                        onChange={(e) => setEditVal(e.target.value)}
                                        onBlur={() => handleSave(emp.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleSave(emp.id);
                                          if (e.key === "Escape") setEditingRecordId(null);
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-primary tracking-tight">{formatCurrency(record.valor_total)}</span>
                                        <div className="opacity-0 group-hover/row:opacity-10 transition-opacity">
                                          <Plus size={8} className="rotate-45" /> 
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground/60 font-mono text-[9px]">{record.data_vencimento ? new Date(record.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                                  <td className="px-4 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${record.status === "enviada" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : record.status === "gerada" ? "bg-primary/10 text-primary border-primary/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"}`}>
                                        {record.status}
                                      </span>
                                      {record.pago ? (
                                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black border bg-emerald-500/20 text-emerald-500 border-emerald-500/30">PAGO</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-lg text-[8px] font-black border border-border/5 text-muted-foreground/30 uppercase">ABERTO</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <button onClick={() => onStartEditMensal(emp.id, record)} className="text-[8px] font-black uppercase tracking-widest text-primary/40 hover:text-primary transition-colors">Editar</button>
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
                         <div className="animate-in slide-in-from-right-1 duration-200 h-[320px] bg-black/5 rounded-xl border border-dashed border-border/10 p-0.5">
                           <div className="h-full overflow-hidden rounded-lg">
                             <ModuleFolderView empresa={emp} departamentoId="financeiro" />
                           </div>
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-border/5">
          <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
            EXIBINDO {pagination.pageIndex * pagination.pageSize + 1} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} DE {totalCount} EMPRESAS
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(0, pagination.pageIndex - 1))}
              disabled={pagination.pageIndex === 0 || loading}
              className="px-3 h-8 text-[8px] font-black uppercase tracking-widest bg-black/10 hover:bg-black/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-all border border-border/10"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
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
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[9px] font-black transition-all ${pagination.pageIndex === pageIdx ? "bg-primary text-white shadow-sm" : "text-muted-foreground/30 hover:text-foreground hover:bg-black/5 font-mono"}`}
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
              className="px-3 h-8 text-[8px] font-black uppercase tracking-widest bg-black/10 hover:bg-black/20 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-all border border-border/10"
            >
              Próxima
            </button>
          </div>
        </div>
        )}
    </div>
  );
};

export default HonorariosEmpresasView;
