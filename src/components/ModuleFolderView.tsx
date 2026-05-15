import React from "react";
import { Button } from "@/components/ui/button";
import { HardDrive } from "lucide-react";

interface ModuleFolderViewProps {
  empresa: {
    id: string;
    nome_empresa: string;
    pasta_servidor?: string;
  };
  departamentoId: string;
}

export const ModuleFolderView: React.FC<ModuleFolderViewProps> = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
      <HardDrive size={40} className="mb-4 opacity-20" />
      <p className="text-sm font-black uppercase tracking-widest">Servidor Offline</p>
      <p className="text-[10px] mt-1 opacity-60">Não foi possível conectar ao FileBrowser.</p>
      <Button variant="outline" disabled className="mt-4 h-9 text-[10px] font-black uppercase tracking-widest">
        Tentar Reconectar
      </Button>
    </div>
  );
};
