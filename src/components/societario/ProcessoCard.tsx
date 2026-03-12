
import React from "react";
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
  onUpdatePasso: (id: string, campo: string, value: any) => void;
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
    <div className={`card-premium !p-0 border-l-8 transition-all duration-500 overflow-hidden ${isExpanded ? "border-l-primary shadow-2xl ring-1 ring-primary/20 scale-[1.01]" : "border-l-muted hover:border-l-primary/40 hover:shadow-md"}`}>
      <div
        className={`p-6 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer transition-colors ${isExpanded ? "bg-primary/[0.02]" : "hover:bg-muted/30"}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-5 flex-1 w-full">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isExpanded ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-primary/10 text-primary"}`}>
            <Building2 size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h4 className="font-black text-card-foreground text-xl group-hover:text-primary transition-colors">{processo.nome_empresa || "Sem Nome"}</h4>
              {processo.status === 'concluido' && <span className="badge-status badge-success text-[10px] font-black px-3 py-1">CONCLUÍDO</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
              <span className="text-xs font-black text-primary uppercase tracking-[0.15em]">{tipoProcessoLabels[processo.tipo] || processo.tipo}</span>
              {processo.numero_processo && <span className="text-xs text-muted-foreground font-mono font-bold opacity-60"># {processo.numero_processo}</span>}
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-bold"><Clock size={14} className="text-primary/60" /> {new Date(processo.data_inicio).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-border/50">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(processo.id, processo.nome_empresa || "Sem Nome"); }}
            className="p-3 rounded-2xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
            title="Excluir Processo"
          >
            <Trash2 size={20} />
          </button>
          <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isExpanded ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-primary"}`}>
            <ChevronDown size={28} />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-8 border-t border-border/50 animate-in slide-in-from-top-4 duration-500 space-y-10 bg-gradient-to-b from-primary/[0.01] to-transparent">
          <div className="flex gap-8 border-b border-border/50 mb-8">
            <button 
              onClick={() => onTabChange('timeline')}
              className={`pb-4 px-2 text-[10px] font-black tracking-widest transition-all border-b-4 ${activeTab === 'timeline' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              LINHA DO TEMPO
            </button>
            <button 
              onClick={() => onTabChange('historico')}
              className={`pb-4 px-2 text-[10px] font-black tracking-widest transition-all border-b-4 ${activeTab === 'historico' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              HISTÓRICO DO PROCESSO
            </button>
          </div>

          {activeTab === 'timeline' ? (
            <ProcessoTimeline 
              processo={processo} 
              onUpdatePasso={onUpdatePasso} 
              onUpdateDetalhePasso={onUpdateDetalhePasso} 
            />
          ) : (
            <ProcessoHistorico historico={processo.historico} />
          )}

          {processo.arquivamento_junta_at && processo.status !== 'concluido' && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => onFinalize(processo)}
                className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-green-500 text-white font-bold text-base shadow-xl hover:shadow-green-500/30 transition-all hover:-translate-y-1 active:scale-95"
              >
                <CheckCircle size={22} className="group-hover:scale-110 transition-transform" /> 
                {processo.tipo === 'alteracao' ? "FINALIZAR PROCESSO E ATUALIZAR EMPRESA" : "FINALIZAR PROCESSO E CADASTRAR EMPRESA"}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
