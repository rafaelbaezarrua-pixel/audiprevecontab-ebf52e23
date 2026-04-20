
import React from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { HonorarioConfig } from "@/types/honorarios";

interface HonorarioConfigFormProps {
  config: Partial<HonorarioConfig>;
  onUpdateField: (field: string, value: string | number | boolean) => void;
  onAddOutroServico: () => void;
  onUpdateOutroServico: (index: number, field: string, value: string | number) => void;
  onRemoveOutroServico: (index: number) => void;
  onSave: () => void;
}

export const HonorarioConfigForm = ({
  config,
  onUpdateField,
  onAddOutroServico,
  onUpdateOutroServico,
  onRemoveOutroServico,
  onSave
}: HonorarioConfigFormProps) => {
  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Valor Base (Honorário Mensal)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={config.valor_honorario || ""} onChange={e => onUpdateField("valor_honorario", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Valor Adicion. por Funcionário</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={config.valor_por_funcionario || ""} onChange={e => onUpdateField("valor_por_funcionario", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Valor Adicion. por Recálculo</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={config.valor_por_recalculo || ""} onChange={e => onUpdateField("valor_por_recalculo", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Valor Adicion. Trabalhista (Fixo)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={config.valor_trabalhista || ""} onChange={e => onUpdateField("valor_trabalhista", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Valor Adicion. por Recibo</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={config.valor_por_recibo || ""} onChange={e => onUpdateField("valor_por_recibo", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-card-foreground">Serviços Adicionais (Extra)</h4>
          <button onClick={onAddOutroServico} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80">
            <Plus size={14} /> Adicionar Serviço
          </button>
        </div>
        <div className="space-y-3">
          {config.outros_servicos?.map((servico: { descricao: string; valor: number }, idx: number) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-background p-3 rounded-lg border border-border">
              <div className="flex-1 w-full text-left">
                <label className={labelCls}>Descrição</label>
                <input type="text" value={servico.descricao || ""} onChange={e => onUpdateOutroServico(idx, "descricao", e.target.value)} className={inputCls} placeholder="Ex: Imposto Sindical, Taxa Extra..." />
              </div>
              <div className="w-full sm:w-1/3 text-left">
                <label className={labelCls}>Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <input type="number" step="0.01" value={servico.valor || ""} onChange={e => onUpdateOutroServico(idx, "valor", e.target.value)} className={`${inputCls} pl-9`} placeholder="0.00" />
                </div>
              </div>
              <button onClick={() => onRemoveOutroServico(idx)} className="p-2 sm:mb-[2px] rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors" title="Excluir Serviço">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {(!config.outros_servicos || config.outros_servicos.length === 0) && (
            <p className="text-xs text-muted-foreground">Nenhum serviço adicional configurado.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={onSave} 
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all" 
          style={{ background: "var(--gradient-primary)" }}
        >
          <Save size={16} /> Salvar Configuração
        </button>
      </div>
    </div>
  );
};
