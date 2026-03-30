
import React from "react";
import { Building2, ChevronDown, ChevronUp, Plus, Clock } from "lucide-react";
import { Empresa } from "@/types/societario";
import { HonorarioConfig, HonorarioMensal } from "@/types/honorarios";
import { HonorarioConfigForm } from "./HonorarioConfigForm";
import { HonorarioMensalForm } from "./HonorarioMensalForm";

interface HonorariosEmpresasViewProps {
  empresas: Empresa[];
  expanded: string | null;
  onToggleExpand: (id: string) => void;
  activeTabs: Record<string, "mensal" | "configuracao">;
  setActiveTab: (id: string, tab: "mensal" | "configuracao") => void;
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
    <div className="space-y-3">
      {loading && empresas.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && empresas.length === 0 && (
        <div className="text-center py-12 card-premium bg-muted/20">
          <p className="text-muted-foreground">Nenhuma empresa encontrada com estes critérios.</p>
        </div>
      )}

      {empresas.map(emp => {
        const isOpen = expanded === emp.id;
        const tab = activeTabs[emp.id] || "mensal";
        const mForm = mensalForms[emp.id];
        const hasMensalRecords = mensalData[emp.id] && mensalData[emp.id].length > 0;

        return (
          <div key={emp.id} className="module-card !p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onToggleExpand(emp.id)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{emp.nome_empresa}</p>
                  <p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>

            {isOpen && (
              <div className="border-t border-border bg-muted/10">
                <div className="flex border-b border-border">
                  <button 
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "mensal" ? "text-primary border-b-2 border-primary bg-background/50" : "text-muted-foreground hover:bg-muted/50"}`} 
                    onClick={() => setActiveTab(emp.id, "mensal")}
                  >
                    Controle Mensal
                  </button>
                  <button 
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "configuracao" ? "text-primary border-b-2 border-primary bg-background/50" : "text-muted-foreground hover:bg-muted/50"}`} 
                    onClick={() => setActiveTab(emp.id, "configuracao")}
                  >
                    Configuração
                  </button>
                </div>

                <div className="p-5">
                  {tab === "configuracao" && (
                    <HonorarioConfigForm 
                      config={configForms[emp.id] || {}}
                      onUpdateField={(f, v) => onUpdateConfigField(emp.id, f, v)}
                      onAddOutroServico={() => onAddOutroServico(emp.id)}
                      onUpdateOutroServico={(idx, f, v) => onUpdateOutroServico(emp.id, idx, f, v)}
                      onRemoveOutroServico={(idx) => onRemoveOutroServico(emp.id, idx)}
                      onSave={() => onSaveConfig(emp.id)}
                    />
                  )}

                  {tab === "mensal" && (
                    <div className="space-y-6">
                      {!mForm && (
                        <div className="flex flex-col sm:flex-row items-end gap-3 bg-background p-4 rounded-lg border border-border">
                          <div className="flex-1 w-full">
                            <label className={labelCls}>Nova Competência</label>
                            <input 
                              type="month" 
                              value={competenciaSelecionada[emp.id] || ""} 
                              onChange={e => setCompetenciaSelecionada(emp.id, e.target.value)} 
                              className={inputCls} 
                            />
                          </div>
                          <button onClick={() => onGenerateMonth(emp.id)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-semibold transition-colors">
                            <Plus size={16} /> Gerar ou Editar Mês
                          </button>
                        </div>
                      )}

                      {mForm && (
                        <HonorarioMensalForm 
                          form={mForm}
                          onUpdateField={(f, v) => onUpdateMensalField(emp.id, f, v)}
                          onCancel={() => onCancelMensalForm(emp.id)}
                          onSave={() => onSaveMensal(emp.id)}
                        />
                      )}

                      {hasMensalRecords && !mForm && (
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                              <tr>
                                <th className="px-4 py-3 font-medium">Competência</th>
                                <th className="px-4 py-3 font-medium">Valor Total</th>
                                <th className="px-4 py-3 font-medium">Vencimento</th>
                                <th className="px-4 py-3 font-medium">Status / Pago</th>
                                <th className="px-4 py-3 font-medium text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-background">
                              {mensalData[emp.id].map((record: HonorarioMensal) => (
                                <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3 font-medium text-card-foreground">{record.competencia}</td>
                                  <td className="px-4 py-3 text-primary font-semibold cursor-pointer group" onDoubleClick={() => handleStartEdit(record)}>
                                    {editingRecordId === record.id ? (
                                      <input
                                        autoFocus
                                        type="text"
                                        className="w-24 px-2 py-1 text-right border border-primary rounded bg-background outline-none"
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
                                        <span>{formatCurrency(record.valor_total)}</span>
                                        <div className="opacity-0 group-hover:opacity-50 transition-opacity">
                                          <Plus size={10} className="rotate-45" /> 
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">{record.data_vencimento ? new Date(record.data_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.status === "enviada" ? "bg-success/10 text-success" : record.status === "gerada" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                                        {record.status}
                                      </span>
                                      {record.pago ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-success/10 text-success border border-success/20">PAGO</span> : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider text-muted-foreground border border-border">PENDENTE</span>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button onClick={() => onStartEditMensal(emp.id, record)} className="text-primary hover:underline text-xs font-medium">Editar</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border/50">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Mostrando {pagination.pageIndex * pagination.pageSize + 1} - {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} de {totalCount} empresas
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, pagination.pageIndex - 1))}
              disabled={pagination.pageIndex === 0 || loading}
              className="px-4 py-2 text-xs font-black uppercase tracking-tighter bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all border border-border/50"
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
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${pagination.pageIndex === pageIdx ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                    >
                      {pageIdx + 1}
                    </button>
                   );
                 });
               })()}
            </div>
            <button
              onClick={() => onPageChange(pagination.pageIndex + 1)}
              disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount || loading}
              className="px-4 py-2 text-xs font-black uppercase tracking-tighter bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all border border-border/50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
