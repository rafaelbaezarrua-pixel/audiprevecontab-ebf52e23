import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { FiscalRecord } from "@/types/fiscal";
import { Database } from "@/integrations/supabase/types";

// Type alias from Supabase gen types
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

interface Props {
  empresa: Empresa | null;
  initialData: Partial<FiscalRecord>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FiscalRecord>) => void;
}

export const FiscalParametersDialog: React.FC<Props> = ({ empresa, initialData, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState<Partial<FiscalRecord>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen || !empresa) return null;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl border border-border/60 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-lg font-bold">Parâmetros</h2>
            <p className="text-xs text-muted-foreground font-medium">{empresa.nome_empresa} ({empresa.cnpj || "Sem CNPJ"})</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={labelCls}>Tipo de Nota</label><input value={form.tipo_nota ?? ""} onChange={e => updateForm('tipo_nota', e.target.value)} className={inputCls} placeholder="NFE, NFCE, NFSE" /></div>
            <div><label className={labelCls}>Recebimento</label><input value={form.recebimento_arquivos ?? ""} onChange={e => updateForm('recebimento_arquivos', e.target.value)} className={inputCls} placeholder="Fly Notas, Email..." /></div>
            <div><label className={labelCls}>Forma de Envio</label><input value={form.forma_envio ?? ""} onChange={e => updateForm('forma_envio', e.target.value)} className={inputCls} placeholder="WhatsApp, Email..." /></div>
            <div><label className={labelCls}>Ramo Empresarial</label><input value={form.ramo_empresarial ?? ""} onChange={e => updateForm('ramo_empresarial', e.target.value)} className={inputCls} placeholder="Comércio, Serviço..." /></div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold border-b border-border pb-2">Alíquotas (%)</h3>
            {empresa.regime_tributario === "lucro_real" || empresa.regime_tributario === "lucro_presumido" ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className={labelCls}>IRPJ</label><input type="number" step="0.01" value={form.aliquota_irpj ?? ""} onChange={e => updateForm('aliquota_irpj', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>CSLL</label><input type="number" step="0.01" value={form.aliquota_csll ?? ""} onChange={e => updateForm('aliquota_csll', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>PIS</label><input type="number" step="0.01" value={form.aliquota_pis ?? ""} onChange={e => updateForm('aliquota_pis', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>COFINS</label><input type="number" step="0.01" value={form.aliquota_cofins ?? ""} onChange={e => updateForm('aliquota_cofins', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>ICMS</label><input type="number" step="0.01" value={form.aliquota_icms ?? ""} onChange={e => updateForm('aliquota_icms', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>ISS</label><input type="number" step="0.01" value={form.aliquota_iss ?? ""} onChange={e => updateForm('aliquota_iss', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>CBS</label><input type="number" step="0.01" value={form.aliquota_cbs ?? ""} onChange={e => updateForm('aliquota_cbs', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
                <div><label className={labelCls}>IBS</label><input type="number" step="0.01" value={form.aliquota_ibs ?? ""} onChange={e => updateForm('aliquota_ibs', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Alíquota Geral</label><input type="number" step="0.01" value={form.aliquota ?? ""} onChange={e => updateForm('aliquota', e.target.value === "" ? null : parseFloat(e.target.value))} className={inputCls} /></div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
          <button onClick={onClose} className="px-4 py-2 hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors">Cancelar</button>
          <button onClick={() => onSave(form)} className="button-premium shadow-sm py-2 px-6 flex items-center gap-2 bg-primary text-primary-foreground rounded-lg hover:brightness-110"><Save size={16} /> Salvar Parâmetros</button>
        </div>
      </div>
    </div>
  );
};
