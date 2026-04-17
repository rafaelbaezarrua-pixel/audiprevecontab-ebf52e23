import React from "react";
import { Plus, XCircle, Save } from "lucide-react";
import { IRPFRecord } from "@/types/irpf";
import { supabase } from "@/integrations/supabase/client";

interface IRPFFormProps {
  record: Partial<IRPFRecord>;
  setRecord: (record: Partial<IRPFRecord>) => void;
  onSave: () => void;
  onCancel: () => void;
  year: number;
}

export const IRPFForm = ({ record, setRecord, onSave, onCancel, year }: IRPFFormProps) => {
  const [usuarios, setUsuarios] = React.useState<{id: string, nome: string}[]>([]);

  React.useEffect(() => {
    const loadUsers = async () => {
      // Busca apenas usuários com papel de 'admin' ou 'user'
      // 1. Buscar IDs de usuários que são da equipe interna (admin ou user)
      const { data: rolesData } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "user"]);
      
      const teamUserIds = rolesData?.map(r => r.user_id) || [];

      // 2. Buscar perfis desses usuários
      const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, nome_completo")
          .in("user_id", teamUserIds)
          .eq("ativo", true);

      if (profiles) {
        const internalMembers = profiles.map(d => ({ 
          id: d.user_id, 
          nome: d.nome_completo || "Sem nome" 
        }));
        setUsuarios(internalMembers);
      }
    };
    loadUsers();
  }, []);

  const inputCls = "w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelCls = "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1";

  return (
    <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-500 ring-4 ring-primary/5">
      <div className="flex items-center gap-3 text-primary mb-6 border-b border-border pb-4">
        <div className="p-2 bg-primary/10 rounded-lg"><Plus size={24} /></div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight">Cadastro Completo</h2>
          <p className="text-xs text-muted-foreground">Preencha todas as informações para o exercício {year}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-primary/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary pl-2">Dados Básicos</h3>
          <div>
            <label className={labelCls}>Nome Completo</label>
            <input
              type="text"
              value={record.nome_completo || ""}
              onChange={e => setRecord({ ...record, nome_completo: e.target.value })}
              className={inputCls}
              placeholder="Nome do cliente"
            />
          </div>
          <div>
            <label className={labelCls}>CPF</label>
            <input
              type="text"
              value={record.cpf || ""}
              onChange={e => setRecord({ ...record, cpf: e.target.value })}
              className={inputCls}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-emerald-500 pl-2">Financeiro</h3>
          <div>
            <label className={labelCls}>Valor a Pagar (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                value={record.valor_a_pagar || 0}
                onChange={e => setRecord({ ...record, valor_a_pagar: Number(e.target.value) })}
                className={inputCls + " pl-10"}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Forma de Pagamento</label>
            <input
              type="text"
              value={record.forma_pagamento || ""}
              onChange={e => setRecord({ ...record, forma_pagamento: e.target.value })}
              className={inputCls}
              placeholder="Ex: Pix, Cartão, Dinheiro"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <span className="text-sm font-bold text-muted-foreground uppercase">Status Pago?</span>
            <button
              onClick={() => setRecord({ ...record, status_pago: !record.status_pago })}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${record.status_pago ? 'bg-emerald-500 text-white shadow-lg' : 'bg-muted text-muted-foreground'}`}
            >
              {record.status_pago ? 'SIM' : 'NÃO'}
            </button>
          </div>
          <div>
            <label className={labelCls}>Data de Pagamento</label>
            <input
              type="date"
              value={record.data_pagamento || ""}
              onChange={e => setRecord({ ...record, data_pagamento: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-blue-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-blue-500 pl-2">Transmissão</h3>
          <div>
            <label className={labelCls}>Status Transmissão</label>
            <select
              value={record.status_transmissao || "pendente"}
              onChange={e => setRecord({ ...record, status_transmissao: e.target.value })}
              className={inputCls}
            >
              <option value="pendente">Pendente</option>
              <option value="transmitida">Transmitida</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Data de Transmissão</label>
            <input
              type="date"
              value={record.data_transmissao || ""}
              onChange={e => setRecord({ ...record, data_transmissao: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Feito por</label>
            <select
              value={record.feito_por || ""}
              onChange={e => setRecord({ ...record, feito_por: e.target.value })}
              className={inputCls}
            >
              <option value="">Selecione o usuário</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.nome}>{u.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-8 border-t border-border mt-8">
        <button onClick={onCancel} className="text-sm font-bold text-muted-foreground px-6 py-2.5 rounded-xl hover:bg-muted transition-all">Cancelar</button>
        <button onClick={onSave} className="bg-primary text-primary-foreground px-10 py-3 rounded-xl hover:scale-105 transition-all font-black uppercase tracking-widest shadow-lg">
          Finalizar {record.id ? 'Edição' : 'Cadastro'}
        </button>
      </div>
    </div>
  );
};
