
import React from "react";
import { Filter, Check, User, MessageSquare } from "lucide-react";
import { Processo } from "@/types/societario";
import { passosConfig } from "@/constants/societario";
import { ControlledInput, ControlledTextarea } from "./SocietarioInputs";
import { toast } from "sonner";

interface ProcessoTimelineProps {
  processo: Processo;
  onUpdatePasso: (id: string, campo: string, value: any) => void;
  onUpdateDetalhePasso: (id: string, stepId: string, field: string, value: string) => void;
}

export const ProcessoTimeline = ({ 
  processo, 
  onUpdatePasso, 
  onUpdateDetalhePasso 
}: ProcessoTimelineProps) => {
  return (
    <div className="space-y-8">
      {processo.tipo === 'alteracao' && processo.eventos && processo.eventos.length > 0 && (
        <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-border mb-6">
          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
            <Filter size={10} /> Eventos de Alteração
          </h5>
          <div className="flex flex-wrap gap-2">
            {processo.eventos.map(ev => <span key={ev} className="px-2 py-1 bg-background border border-border rounded text-[10px] font-medium">{ev}</span>)}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {passosConfig.map((step, idx) => {
          const isDone = !!(processo as any)[step.id];
          const prevStepId = idx > 0 ? passosConfig[idx - 1].id : null;
          const isPrevDone = prevStepId ? !!(processo as any)[prevStepId] : true;
          
          const isDBE = step.id === 'envio_dbe_at';
          const isSignature = step.id === 'assinatura_contrato_at';
          const hasApprovalGate = processo.tipo === 'alteracao' || processo.tipo === 'abertura' || processo.tipo === 'abertura_mei';
          
          const isBlockedByExigencia = step.id === 'arquivamento_junta_at' && (processo.tipo === 'abertura' || processo.tipo === 'abertura_mei') && !processo.foi_deferido && !processo.exigencia_respondida;
          const canComplete = !isDone && isPrevDone && !isBlockedByExigencia;

          const detalhes = (processo.detalhes_passos && processo.detalhes_passos[step.id]) || {};

          return (
            <div key={step.id} className="relative pl-10">
              {idx < passosConfig.length - 1 && (
                <div className={`absolute left-4 top-8 bottom-0 w-0.5 -ml-px ${isDone ? "bg-primary" : "bg-muted"}`} />
              )}

              <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? "bg-primary border-primary text-primary-foreground" : isPrevDone ? "border-primary/50 text-primary" : "border-muted text-muted-foreground"}`}>
                {isDone ? <Check size={16} strokeWidth={3} /> : <span className="text-xs font-bold">{idx + 1}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4">
                  <h5 className={`font-bold transition-colors ${isDone ? "text-primary" : "text-card-foreground"}`}>{step.label}</h5>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (isDone) return;
                          if (!isPrevDone) { toast.error("Conclua a etapa anterior"); return; }
                          if (isBlockedByExigencia) { toast.error("Aguardando Deferimento ou Resposta de Exigência"); return; }
                          if (hasApprovalGate && isDBE && processo.dbe_deferido === undefined) {
                            toast.error("Marque se o DBE foi deferido ou não"); return;
                          }
                          onUpdatePasso(processo.id, step.id, new Date().toISOString());
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase transition-all ${isDone ? "bg-green-500 text-white" : canComplete ? "bg-primary text-white hover:scale-105 cursor-pointer" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                      >
                        {isDone ? "Concluído" : "Marcar Concluído"}
                      </button>
                      {isDone && <span className="text-[10px] font-mono text-muted-foreground">{new Date((processo as any)[step.id]).toLocaleString()}</span>}
                    </div>

                    {hasApprovalGate && isDBE && !isDone && isPrevDone && (
                      <div className="flex gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                        <button 
                          onClick={() => onUpdatePasso(processo.id, 'dbe_deferido', true)}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${processo.dbe_deferido === true ? "bg-green-500 text-white" : "bg-background text-muted-foreground"}`}
                        >
                          DEFERIDO
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm("Reiniciar todo o processo?")) {
                              onUpdatePasso(processo.id, 'dbe_deferido', false);
                            }
                          }}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${processo.dbe_deferido === false ? "bg-destructive text-white" : "bg-background text-muted-foreground"}`}
                        >
                          NÃO DEFERIDO
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                      <User size={10} /> Enviado por
                    </label>
                    <ControlledInput
                      value={detalhes.enviado_por || ''}
                      onBlur={val => onUpdateDetalhePasso(processo.id, step.id, 'enviado_por', val)}
                      placeholder="Quem enviou?"
                      className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tighter">
                      <MessageSquare size={10} /> Observações
                    </label>
                    <ControlledTextarea
                      value={detalhes.observacoes || ''}
                      onBlur={val => onUpdateDetalhePasso(processo.id, step.id, 'observacoes', val)}
                      placeholder="Ocorrências..."
                      rows={1}
                      className="w-full px-3 py-1.5 border border-border rounded-lg bg-background text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
