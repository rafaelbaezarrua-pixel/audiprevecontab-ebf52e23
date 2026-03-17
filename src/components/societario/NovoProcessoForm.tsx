
import React from "react";
import { Plus, X } from "lucide-react";
import { Empresa } from "@/types/societario";
import { tipoProcessoLabels, eventosAlteracao } from "@/constants/societario";

interface NovoProcessoFormProps {
  empresas: Empresa[];
  novoProcessoData: {
    tipo: string;
    nome_empresa: string;
    empresa_id: string | null;
    numero_processo: string;
    data_inicio: string;
    eventos: string[];
  };
  setNovoProcessoData: (data: NovoProcessoFormProps["novoProcessoData"]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const NovoProcessoForm = ({ 
  empresas, 
  novoProcessoData, 
  setNovoProcessoData, 
  onSubmit, 
  onCancel 
}: NovoProcessoFormProps) => {
  return (
    <div className="card-premium bg-primary/[0.02] border-primary/20 animate-in zoom-in-95 duration-300 ring-4 ring-primary/5">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-primary/10">
        <h4 className="font-black text-primary flex items-center gap-2">
          <Plus size={20} /> INICIAR NOVO PROCESSO
        </h4>
        <button onClick={onCancel} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
      </div>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">TIPO DE PROCESSO</label>
            <select 
              value={novoProcessoData.tipo} 
              onChange={e => setNovoProcessoData({ ...novoProcessoData, tipo: e.target.value, empresa_id: null, nome_empresa: '', eventos: [] })} 
              className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
            >
              {Object.entries(tipoProcessoLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          
          {novoProcessoData.tipo === 'alteracao' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SELECIONAR EMPRESA</label>
              <select 
                value={novoProcessoData.empresa_id || ''} 
                onChange={e => setNovoProcessoData({ ...novoProcessoData, empresa_id: e.target.value })} 
                className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecione uma empresa...</option>
                {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">NOME DA EMPRESA</label>
              <input 
                value={novoProcessoData.nome_empresa} 
                onChange={e => setNovoProcessoData({ ...novoProcessoData, nome_empresa: e.target.value })} 
                placeholder="Ex: Audipreve Contabilidade LTDA" 
                className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" 
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nº PROCESSO (Protocolo)</label>
            <input 
              value={novoProcessoData.numero_processo} 
              onChange={e => setNovoProcessoData({ ...novoProcessoData, numero_processo: e.target.value })} 
              placeholder="Digite se houver..." 
              className="w-full px-4 py-3 border border-border rounded-2xl bg-background text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all" 
            />
          </div>
        </div>

        {novoProcessoData.tipo === 'alteracao' && (
          <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
            <label className="text-[10px] font-black text-muted-foreground block mb-6 uppercase tracking-[0.2em] ml-1">TIPOS DE ALTERAÇÃO (Selecione um ou mais)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {eventosAlteracao.map(evento => (
                <label key={evento} className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-background transition-all border border-transparent hover:border-border/50">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={novoProcessoData.eventos.includes(evento)}
                    onChange={e => {
                      if (e.target.checked) {
                        setNovoProcessoData({ ...novoProcessoData, eventos: [...novoProcessoData.eventos, evento] });
                      } else {
                        setNovoProcessoData({ ...novoProcessoData, eventos: novoProcessoData.eventos.filter(ev => ev !== evento) });
                      }
                    }}
                  />
                  <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{evento}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            onClick={onSubmit} 
            className="button-premium !px-12 py-4"
          >
            Iniciar Processo Agora
          </button>
        </div>
      </div>
    </div>
  );
};
