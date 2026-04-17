
import React from "react";
import { formatDateBR } from "@/lib/utils";
import { Building2, History, Clock, ChevronDown, Trash2, CheckCircle, ArrowRight } from "lucide-react";
import { Processo } from "@/types/societario";
import { tipoProcessoLabels } from "@/constants/societario";
import { ProcessoTimeline } from "./ProcessoTimeline";
import { ProcessoHistorico } from "./ProcessoHistorico";

interface ProcessoCardProps {
  processo: Processo;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: (id: string, nome: string) => void;
  activeTab: 'timeline' | 'historico';
  onTabChange: (tab: 'timeline' | 'historico') => void;
  onUpdatePasso: (id: string, campo: string, value: string | number | boolean | null) => void;
  onUpdateDetalhePasso: (id: string, stepId: string, field: string, value: string) => void;
  onFinalize: (processo: Processo) => void;
}

export const ProcessoCard = ({
  processo,
  isExpanded,
  onToggleExpand,
  onDelete,
  activeTab,
  onTabChange,
  onUpdatePasso,
  onUpdateDetalhePasso,
  onFinalize
}: ProcessoCardProps) => {
  return (
    <div className={`bg-card border-l-4 transition-all duration-300 overflow-hidden rounded-xl border border-border/10 shadow-sm ${isExpanded ? "border-l-primary shadow-xl ring-1 ring-primary/20" : "border-l-muted hover:border-l-primary/40"}`}>
      <div
        className={`h-11 px-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${isExpanded ? "bg-black/10 dark:bg-white/5" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 shrink-0 ${isExpanded ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-black/10 dark:bg-white/5 text-muted-foreground/50 border border-border/10 shadow-inner"}`}>
            <Building2 size={13} />
          </div>
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden shrink-0">
              <h4 className="font-black text-card-foreground text-[11px] uppercase tracking-tighter truncate max-w-[180px] sm:max-w-xs">{processo.nome_empresa || "Sem Nome"}</h4>
              {processo.status === 'concluido' && <span className="badge-status badge-success text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest shrink-0">CONCLUÍDO</span>}
            </div>
            
            <div className="hidden sm:flex items-center gap-4 shrink-0">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{tipoProcessoLabels[processo.tipo] || processo.tipo}</span>
              {processo.numero_processo && <span className="text-[8px] text-muted-foreground/30 font-mono font-black uppercase tracking-widest shrink-0"># {processo.numero_processo}</span>}
              <span className="text-[8px] text-muted-foreground/40 flex items-center gap-1 font-black uppercase tracking-widest shrink-0"><Clock size={10} className="text-primary/30" /> {formatDateBR(processo.data_inicio)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(processo.id, processo.nome_empresa || "Sem Nome"); }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground/20 hover:text-destructive transition-all"
            title="Excluir Processo"
          >
            <Trash2 size={14} />
          </button>
          <div className={`p-1 rounded-md transition-all duration-300 ${isExpanded ? "bg-primary text-primary-foreground rotate-180" : "text-muted-foreground/20"}`}>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-border/5 bg-gradient-to-b from-primary/[0.01] to-transparent space-y-4">
          <div className="flex bg-black/10 dark:bg-white/5 p-0.5 rounded-lg w-fit shadow-inner">
            <button 
              onClick={() => onTabChange('timeline')}
              className={`px-4 h-8 text-[8px] font-black tracking-[0.1em] uppercase transition-all rounded-md ${activeTab === 'timeline' ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
            >
              Monitoramento Técnico
            </button>
            <button 
              onClick={() => onTabChange('historico')}
              className={`px-4 h-8 text-[8px] font-black tracking-[0.1em] uppercase transition-all rounded-md ${activeTab === 'historico' ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground"}`}
            >
              Registro de Atividades
            </button>
          </div>

          <div className="animate-in fade-in duration-300">
            {activeTab === 'timeline' ? (
              <ProcessoTimeline 
                processo={processo} 
                onUpdatePasso={onUpdatePasso} 
                onUpdateDetalhePasso={onUpdateDetalhePasso} 
              />
            ) : (
              <ProcessoHistorico historico={processo.historico} />
            )}
          </div>

          {processo.arquivamento_junta_at && processo.status !== 'concluido' && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => onFinalize(processo)}
                className="group flex items-center gap-3 h-11 px-8 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
              >
                <CheckCircle size={14} className="group-hover:scale-110 transition-transform" /> 
                {processo.tipo === 'alteracao' ? "Finalizar e Atualizar Cadastro" : "Finalizar e Registrar Empresa"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
