import React, { useState } from "react";
import { useFileManager } from "@/hooks/useFileManager";
import { buildPath, getFileIcon, formatBytes, formatDate } from "@/config/fileManagerConfig";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FolderOpen, Upload, RefreshCw, Download, Trash2, HardDrive, ArrowLeft, Eye } from "lucide-react";
import { DEPARTAMENTOS } from "@/config/fileManagerConfig";
import { fbPreviewUrl } from "@/lib/filebrowser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ModuleFolderViewProps {
  empresa: {
    id: string;
    nome_empresa: string;
    pasta_servidor?: string;
  };
  departamentoId: string; // 'fiscal', 'pessoal', 'contabil', etc.
}

export const ModuleFolderView: React.FC<ModuleFolderViewProps> = ({ empresa, departamentoId }) => {
  const depto = DEPARTAMENTOS.find((d) => d.id === departamentoId);
  const initialPath = buildPath(empresa.pasta_servidor || empresa.nome_empresa, depto);
  
  const fm = useFileManager(initialPath);
  const uploadRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handlePreview = async (item: any) => {
    setPreview(item);
    const url = await fbPreviewUrl(item.path);
    setPreviewUrl(url);
  };

  if (fm.connected === false) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/5">
        <HardDrive size={40} className="mb-4 opacity-20" />
        <p className="text-sm font-black uppercase tracking-widest">Servidor Offline</p>
        <p className="text-[10px] mt-1 opacity-60">Não foi possível conectar ao FileBrowser.</p>
        <Button variant="outline" onClick={fm.reload} className="mt-4 h-9 text-[10px] font-black uppercase tracking-widest">
          Tentar Reconectar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] border border-border/60 rounded-2xl bg-card/30 overflow-hidden animate-fade-in shadow-inner">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors" 
            onClick={fm.navigateUp}
            disabled={fm.currentPath === initialPath || fm.loading}
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
               <span className="text-primary">{depto?.icon}</span>
               <span className="text-[10px] font-black uppercase tracking-widest truncate text-card-foreground">
                 {fm.currentPath.split('/').pop() || (depto?.label)}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-background shadow-sm hover:border-primary hover:text-primary transition-all" 
            onClick={() => uploadRef.current?.click()}
            disabled={fm.loading}
          >
            <Upload size={14} /> Upload
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-9 w-9 p-0 hover:bg-background border border-transparent hover:border-border transition-all" 
            onClick={fm.reload} 
            disabled={fm.loading}
          >
            <RefreshCw size={14} className={fm.loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {fm.loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-primary/40" size={32} />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Lendo Arquivos...</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-0">
            {fm.listing?.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/40">
                <FolderOpen size={48} className="mb-2 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Pasta Vazia</p>
              </div>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm border-b border-border/40 z-10">
                  <tr>
                    <th className="text-left px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nome</th>
                    <th className="text-right px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Tamanho</th>
                    <th className="text-right px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {fm.listing?.items.sort((a,b) => (a.isDir === b.isDir ? 0 : a.isDir ? -1 : 1)).map((item) => (
                    <tr 
                      key={item.path} 
                      className="hover:bg-primary/5 group cursor-pointer transition-colors"
                      onClick={() => item.isDir ? fm.navigate(item.path) : handlePreview(item)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl leading-none">{getFileIcon(item.isDir, item.extension)}</span>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-black text-card-foreground text-xs group-hover:text-primary transition-colors">{item.name}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">{formatDate(item.modified)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground text-[10px] font-bold hidden sm:table-cell">
                        {item.isDir ? '—' : formatBytes(item.size)}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary" onClick={() => fm.download(item)}>
                             <Download size={14} />
                           </Button>
                           <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => fm.remove([item])}>
                             <Trash2 size={14} />
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => { setPreview(null); setPreviewUrl(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 border-primary/20 shadow-2xl overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
             <div className="flex items-center gap-3">
                <span className="text-2xl">{preview && getFileIcon(false, preview.extension)}</span>
                <div className="space-y-0.5">
                  <DialogTitle className="text-sm font-black uppercase tracking-tight">{preview?.name}</DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase">{preview && formatBytes(preview.size)} • {preview && formatDate(preview.modified)}</DialogDescription>
                </div>
             </div>
          </DialogHeader>
          <div className="flex-1 bg-black/5 p-4 flex items-center justify-center overflow-auto min-h-[400px]">
            {!previewUrl ? (
              <Loader2 className="animate-spin text-primary" />
            ) : preview?.extension.toLowerCase() === '.pdf' ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg shadow-sm" />
            ) : ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(preview?.extension.toLowerCase()) ? (
              <img src={previewUrl} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" alt={preview.name} />
            ) : (
              <div className="text-center space-y-4">
                <FolderOpen size={48} className="mx-auto text-muted-foreground opacity-20" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Visualização não disponível</p>
                <Button onClick={() => fm.download(preview)} className="button-premium">
                   <Download className="mr-2 h-4 w-4" /> Baixar Arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <input ref={uploadRef} type="file" multiple className="hidden" onChange={(e) => e.target.files && fm.upload(e.target.files)} />
    </div>
  );
};
