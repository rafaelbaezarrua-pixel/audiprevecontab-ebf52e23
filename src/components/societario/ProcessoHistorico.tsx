
import React from "react";
import { History, Clock } from "lucide-react";
import { HistoricoProcesso } from "@/types/societario";

interface ProcessoHistoricoProps {
  historico?: HistoricoProcesso[];
}

export const ProcessoHistorico = ({ historico }: ProcessoHistoricoProps) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 px-2 pb-6">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <History size={14} className="text-primary" /> Cronologia Completa do Processo
        </h5>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
          {historico?.length || 0} Registros
        </span>
      </div>
      
      <div className="space-y-4">
        {(!historico || historico.length === 0) ? (
          <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border text-muted-foreground">
            <Clock size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">Nenhum histórico registrado ainda</p>
            <p className="text-[10px] opacity-70">As ações realizadas aparecerão aqui</p>
          </div>
        ) : (
          [...historico].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h, hIdx) => (
            <div key={h.id} className="relative pl-8 pb-6 last:pb-0">
              {hIdx < historico!.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-muted/50" />
              )}
              <div className="absolute left-0 top-1.5 w-6 h-6 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center z-10 transition-transform hover:scale-110">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
              <div className="bg-card/50 p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-all hover:bg-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-primary tracking-tight">
                    {h.acao.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.detalhes && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {h.detalhes}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
