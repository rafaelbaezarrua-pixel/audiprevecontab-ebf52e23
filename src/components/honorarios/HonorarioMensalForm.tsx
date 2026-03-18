
import React from "react";
import { Calendar, DollarSign, Save } from "lucide-react";
import { HonorarioMensal } from "@/types/honorarios";

interface HonorarioMensalFormProps {
  form: HonorarioMensal;
  onUpdateField: (field: string, value: string | number | boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const HonorarioMensalForm = ({
  form,
  onUpdateField,
  onCancel,
  onSave
}: HonorarioMensalFormProps) => {
  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="bg-background p-5 rounded-lg border border-primary/20 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
          <Calendar size={16} className="text-primary" /> Competência: {form.competencia}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Qtd. Funcionários</label>
          <p className="text-sm text-card-foreground font-medium">{form.qtd_funcionarios}</p>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Qtd. Recálculos</label>
          <p className="text-sm text-card-foreground font-medium">{form.qtd_recalculos}</p>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Encargos Trab.</label>
          <p className="text-sm text-card-foreground font-medium">{form.teve_encargo_trabalhista ? "Sim" : "Não"}</p>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Qtd. Recibos</label>
          <p className="text-sm text-card-foreground font-medium">{form.qtd_recibos || 0}</p>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-primary font-bold mb-1">Valor Total Calculado</label>
          <p className="text-lg text-primary font-bold">{formatCurrency(form.valor_total)}</p>
        </div>
      </div>

      {form.detalhes_calculo && form.detalhes_calculo.length > 0 && (
        <div className="bg-muted/10 border border-border rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
            <DollarSign size={14} /> Detalhamento do Cálculo
          </h4>
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground uppercase border-b border-border pb-1">
              <div className="col-span-2">Descrição</div>
              <div className="text-right">Qtd x Valor</div>
              <div className="text-right">Total</div>
            </div>
            {form.detalhes_calculo.map((det: { rotulo: string; qtd: number; vlrUnit: number; vlrTotal: number }, idx: number) => (
              <div key={idx} className="grid grid-cols-4 text-xs items-center py-1">
                <div className="col-span-2 font-medium text-card-foreground line-clamp-1" title={det.rotulo}>{det.rotulo}</div>
                <div className="text-right text-muted-foreground">
                  {det.qtd} x {formatCurrency(det.vlrUnit)}
                </div>
                <div className="text-right font-bold text-card-foreground">
                  {formatCurrency(det.vlrTotal)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Data Vencimento</label>
          <input type="date" value={form.data_vencimento || ""} onChange={e => onUpdateField("data_vencimento", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Data Envio</label>
          <input type="date" value={form.data_envio || ""} onChange={e => onUpdateField("data_envio", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Forma Envio</label>
          <input type="text" value={form.forma_envio || ""} onChange={e => onUpdateField("forma_envio", e.target.value)} className={inputCls} placeholder="Ex: WhatsApp, Email" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status || "pendente"} onChange={e => onUpdateField("status", e.target.value)} className={inputCls}>
            <option value="pendente">Pendente</option>
            <option value="gerada">Gerada</option>
            <option value="enviada">Enviada</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <input type="checkbox" id="pago-mensal" checked={form.pago || false} onChange={e => onUpdateField("pago", e.target.checked)} className="w-4 h-4 rounded text-primary border-border" />
          <label htmlFor="pago-mensal" className="text-sm font-medium text-card-foreground cursor-pointer">Honorário Pago</label>
        </div>
        <div>
          <label className={labelCls}>Valor Ajustado Manualmente</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <input type="number" step="0.01" value={form.valor_total || ""} onChange={e => onUpdateField("valor_total", parseFloat(e.target.value) || 0)} className={`${inputCls} pl-9`} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Observações</label>
        <textarea 
          value={typeof form.observacoes === 'string' ? form.observacoes : form.observacoes?.texto || ""} 
          onChange={e => onUpdateField("observacoes", e.target.value)} 
          className={`${inputCls} min-h-[80px] resize-y`} 
          placeholder="Observações..." 
        />
      </div>

      <div className="flex justify-end pt-2">
        <button 
          onClick={onSave} 
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" 
          style={{ background: "var(--gradient-primary)" }}
        >
          <Save size={16} /> Salvar Mês
        </button>
      </div>
    </div>
  );
};
