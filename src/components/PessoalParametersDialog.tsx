import React, { useState, useEffect } from "react";
import { X, Save, Users, CreditCard, Clock, Gift } from "lucide-react";
import { PessoalRecord } from "@/types/pessoal";
import { Database } from "@/integrations/supabase/types";

type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

interface Props {
  empresa: Empresa | null;
  initialData: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const PessoalParametersDialog: React.FC<Props> = ({ empresa, initialData, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen || !empresa) return null;

  const inputCls = "w-full h-11 px-4 border border-border/60 rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold";
  const labelCls = "block text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1.5 ml-1";

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-[100] bg-background/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl border border-border/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Settings size={22} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">Parâmetros de DP</h2>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">{empresa.nome_empresa}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground hover:bg-muted p-2 rounded-full transition-all"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Informações de Equipe */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}><Users size={12} className="inline mr-1" /> Funcionários</label>
              <input type="number" value={form.qtd_funcionarios ?? 0} onChange={e => updateForm('qtd_funcionarios', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}><CreditCard size={12} className="inline mr-1" /> Pró-Labore</label>
              <input type="number" value={form.qtd_pro_labore ?? 0} onChange={e => updateForm('qtd_pro_labore', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Forma de Envio</label>
              <input value={form.forma_envio ?? ""} onChange={e => updateForm('forma_envio', e.target.value)} className={inputCls} placeholder="WhatsApp, E-mail..." />
            </div>
            <div className="space-y-1">
              <label className={labelCls}><Clock size={12} className="inline mr-1" /> Ponto Manual</label>
              <select value={form.possui_ponto_manual ? "sim" : "nao"} onChange={e => updateForm('possui_ponto_manual', e.target.value === "sim")} className={inputCls}>
                <option value="nao">Não Utiliza</option>
                <option value="sim">Sim, Requerido</option>
              </select>
            </div>
          </div>

          {/* BENEFÍCIOS */}
          <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Benefícios</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'possui_vt', label: 'Vale Transporte (VT)' },
                { id: 'possui_vr', label: 'Vale Refeição (VR)' },
                { id: 'possui_va', label: 'Vale Alimentação (VA)' },
                { id: 'possui_vc', label: 'Vale Combustível (VC)' }
              ].map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/50 group/item hover:border-primary/30 transition-all">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{b.label}</span>
                  <button
                    onClick={() => updateForm(b.id, !form[b.id])}
                    className={`w-10 h-5 rounded-full relative transition-all shadow-inner ${form[b.id] ? 'bg-emerald-500' : 'bg-muted-foreground/20'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${form[b.id] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-muted/5">
          <button onClick={onClose} className="px-5 py-2.5 hover:bg-muted text-muted-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition-all">Cancelar</button>
          <button onClick={() => onSave(form)} className="px-8 py-2.5 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-primary/10 flex items-center gap-2 transition-all">
            <Save size={16} /> Salvar Parâmetros
          </button>
        </div>
      </div>
    </div>
  );
};

import { Settings } from "lucide-react";
