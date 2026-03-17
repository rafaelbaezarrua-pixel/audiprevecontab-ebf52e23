
import React from "react";
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
        <div className="p-6 border-t border-border/50 bg-background/40 space-y-6 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><DollarSign size={14} /> Informações de Pagamento</h4>
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                  <input type="text" value={record.nome_completo} onChange={e => onUpdateField(record.id, "nome_completo", e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">CPF</label>
                  <input type="text" value={record.cpf || ''} onChange={e => onUpdateField(record.id, "cpf", e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Valor a Pagar</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                    <input type="number" value={record.valor_a_pagar} onChange={e => onUpdateField(record.id, "valor_a_pagar", Number(e.target.value))} className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Data do Pagamento</label>
                  <input type="date" value={record.data_pagamento || ''} onChange={e => onUpdateField(record.id, "data_pagamento", e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> Status de Transmissão</h4>
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Transmissão</span>
                  <button onClick={() => onQuickToggleTransmissao(record)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${record.status_transmissao === 'transmitida' ? 'bg-blue-500 text-white' : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white'}`}>
                    {record.status_transmissao === 'transmitida' ? 'TRANSMITIDA' : 'PENDENTE'}
                  </button>
                </div>
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">Data de Transmissão</label>
                  <input type="date" value={record.data_transmissao || ''} onChange={e => onUpdateField(record.id, "data_transmissao", e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Transmitido por</label>
                  <input type="text" value={record.transmitido_por || ''} onChange={e => onUpdateField(record.id, "transmitido_por", e.target.value)} className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary" placeholder="Nome do responsável" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Plus size={14} /> Ações Disponíveis</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => onSave(record)} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-all font-medium"><Save size={18} /> Salvar Alterações</button>
                <button onClick={() => onDelete(record.id)} className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive py-2 rounded-lg hover:bg-destructive hover:text-white transition-all font-medium"><Trash2 size={18} /> Excluir Registro</button>
              </div>
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] text-primary/60 font-medium uppercase tracking-tighter mb-1 font-bold">Resumo Financeiro</p>
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">{formatCurrency(record.valor_a_pagar)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
