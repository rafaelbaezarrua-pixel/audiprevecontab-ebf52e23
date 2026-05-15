import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, CheckCircle, AlertCircle, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/PageSkeleton";

const PortalProcessosPage: React.FC = () => {
  const { userData } = useAuth();

  const { data: processos, isLoading } = useQuery({
    queryKey: ["portal_processos", userData?.empresaId],
    queryFn: async () => {
      if (!userData?.empresaId) return [];
      const { data, error } = await supabase
        .from("processos_societarios" as any)
        .select("*")
        .eq("empresa_id", userData.empresaId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.empresaId
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido": return <CheckCircle className="text-emerald-500" size={18} />;
      case "cancelado": return <AlertCircle className="text-destructive" size={18} />;
      default: return <Clock className="text-amber-500" size={18} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Meus Processos</h1>
        <p className="text-sm text-muted-foreground font-medium">Acompanhe o andamento das suas solicitações societárias.</p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : !processos || processos.length === 0 ? (
        <div className="module-card flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Activity size={32} className="text-muted-foreground opacity-20" />
          </div>
          <h3 className="font-bold text-foreground">Nenhum processo encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">Você ainda não possui processos de abertura ou alteração em andamento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {processos.map((p: any) => (
            <div key={p.id} className="module-card hover:border-primary/50 transition-all group cursor-default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                    p.status === "concluido" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                  }`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground text-lg">{p.tipo === "abertura" ? "Abertura de Empresa" : "Alteração Contratual"}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                        p.status === "concluido" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium mt-1">
                      <span className="flex items-center gap-1"><Clock size={12} /> Iniciado em: {format(new Date(p.created_at), 'dd/MM/yyyy')}</span>
                      {p.numero_processo && <span>• Nº {p.numero_processo}</span>}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Etapa Atual</p>
                    <p className="text-sm font-bold text-foreground">{p.current_step === 'arquivamento_junta_at' ? 'Arquivamento' : p.current_step === 'reserva_nome_at' ? 'Reserva de Nome' : 'Em andamento'}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalProcessosPage;
