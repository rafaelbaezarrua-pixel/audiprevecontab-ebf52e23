import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const GerenciadorArquivosPage: React.FC = () => {
  // mantém a query de empresas para eventual reativação futura
  useQuery({
    queryKey: ["empresas-file-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome_empresa, pasta_servidor")
        .order("nome_empresa");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: false, // desabilitado enquanto FileBrowser está inativo
  });

  return (
    <div className="space-y-6 animate-fade-in relative pb-10">

      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="header-title">Gerenciador de Arquivos</h1>
            <FavoriteToggleButton moduleId="gerenciador_arquivos" />
          </div>
          <p className="subtitle-premium">
            Acesso ao servidor de arquivos · Sincronizado com OneDrive
          </p>
        </div>

        {/* Status de conexão */}
        <div className="flex items-center gap-2">
          <span className="badge-status badge-danger text-[9px] flex items-center gap-1">
            <WifiOff size={10} /> SERVIDOR OFFLINE
          </span>
        </div>
      </div>

      {/* Painel principal */}
      <div
        className="card-premium !p-0 overflow-hidden flex items-center justify-center"
        style={{ height: "calc(100vh - 240px)", minHeight: 500 }}
      >
        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <WifiOff size={40} className="opacity-30" />
          <p className="text-sm font-bold">Servidor Offline</p>
          <p className="text-xs text-center max-w-xs opacity-70">
            Verifique se o FileBrowser está rodando no servidor e se o IP está correto no .env
          </p>
          <Button size="sm" variant="outline" className="mt-2" disabled>
            <RefreshCw size={14} className="mr-2" /> Tentar Novamente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorArquivosPage;
