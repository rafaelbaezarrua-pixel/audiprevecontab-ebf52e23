
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, CheckCircle2, XCircle, ChevronUp, ChevronDown, DollarSign, FileText, Save, Trash2, Plus } from "lucide-react";
import { IRPFRecord } from "@/types/irpf";

interface IRPFRecordCardProps {
  record: IRPFRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateField: (id: string, field: string, value: string | number | boolean) => void;
  onSave: (record: IRPFRecord) => void;
  onDelete: (id: string) => void;
  onQuickToggleTransmissao: (record: IRPFRecord) => void;
}

export const IRPFRecordCard = ({
  record, isExpanded, onToggleExpand, onUpdateField, onSave, onDelete, onQuickToggleTransmissao
}: IRPFRecordCardProps) => {
  const [usuarios, setUsuarios] = React.useState<{id: string, nome: string}[]>([]);

  React.useEffect(() => {
    const loadUsers = async () => {
      const { data: rolesData } = await (supabase as any).from("user_roles").select("user_id, role");
      const clientUserIds = rolesData?.filter((r: any) => r.role === 'client').map((r: any) => r.user_id) || [];

      const { data: profilesData } = await (supabase as any).from("profiles").select("user_id, nome_completo");
      if (profilesData) {
        const internalMembers = profilesData
          .filter((p: any) => !clientUserIds.includes(p.user_id))
          .map((d: any) => ({ id: d.user_id, nome: d.nome_completo || "Sem nome" }));
        setUsuarios(internalMembers);
      }
    };
    loadUsers();
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20 bg-muted/20' : 'hover:border-primary/30'}`}>
      <div onClick={onToggleExpand} className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none">
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className={`p-2 rounded-lg ${record.status_transmissao === 'transmitida' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
            <User size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{record.nome_completo}</h3>
            <p className="text-xs text-muted-foreground">{record.cpf || 'Sem CPF'} • Exercício {record.ano_exercicio}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Pagamento</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {record.status_pago ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-500"><CheckCircle2 size={14} /> Pago</span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-red-400"><XCircle size={14} /> Pendente</span>
              )}
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {record.status_transmissao === 'transmitida' ? (
                <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Transmitida</span>
              ) : (
                <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pendente</span>
              )}
            </div>
          </div>

          <div className="text-muted-foreground transition-transform duration-300">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 border-t border-border/50 bg-background/40 space-y-8 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-primary/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary pl-2">Dados Básicos</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Nome Completo</label>
                  <input type="text" value={record.nome_completo} onChange={e => onUpdateField(record.id, "nome_completo", e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">CPF</label>
                  <input type="text" value={record.cpf || ''} onChange={e => onUpdateField(record.id, "cpf", e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" placeholder="000.000.000-00" />
                </div>
              </div>
            </div>

            {/* Financeiro */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-emerald-500 pl-2">Financeiro</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Valor a Pagar (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">R$</span>
                    <input type="number" step="0.01" value={record.valor_a_pagar} onChange={e => onUpdateField(record.id, "valor_a_pagar", Number(e.target.value))} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Forma de Pagamento</label>
                  <input 
                    type="text" 
                    value={record.forma_pagamento || ''} 
                    onChange={e => onUpdateField(record.id, "forma_pagamento", e.target.value)} 
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" 
                    placeholder="Ex: Pix, Cartão, Dinheiro" 
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Status Pago?</span>
                  <button
                    onClick={() => onUpdateField(record.id, "status_pago", !record.status_pago)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${record.status_pago ? 'bg-emerald-500 text-white shadow-lg' : 'bg-muted text-muted-foreground'}`}
                  >
                    {record.status_pago ? 'SIM' : 'NÃO'}
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Data de Pagamento</label>
                  <input type="date" value={record.data_pagamento || ''} onChange={e => onUpdateField(record.id, "data_pagamento", e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
              </div>
            </div>

            {/* Transmissão */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-blue-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-blue-500 pl-2">Transmissão</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Status Transmissão</label>
                  <select
                    value={record.status_transmissao || "pendente"}
                    onChange={e => onUpdateField(record.id, "status_transmissao", e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="transmitida">Transmitida</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Data de Transmissão</label>
                  <input type="date" value={record.data_transmissao || ''} onChange={e => onUpdateField(record.id, "data_transmissao", e.target.value)} className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Feito por</label>
                  <select
                    value={record.feito_por || ""}
                    onChange={e => onUpdateField(record.id, "feito_por", e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  >
                    <option value="">Selecione o usuário</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nome}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="pt-6 border-t border-border mt-6">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">Observações</h3>
            <textarea
              value={record.observacoes || ''}
              onChange={e => onUpdateField(record.id, "observacoes", e.target.value)}
              placeholder="Adicione observações adicionais aqui..."
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm min-h-[100px] resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border mt-6">
            <button onClick={() => onDelete(record.id)} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-all">
              <Trash2 size={16} /> Excluir Registro
            </button>
            <button onClick={() => onSave(record)} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-10 py-3 rounded-xl hover:scale-105 transition-all font-black uppercase tracking-widest shadow-lg">
              <Save size={18} /> Finalizar Edição
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
