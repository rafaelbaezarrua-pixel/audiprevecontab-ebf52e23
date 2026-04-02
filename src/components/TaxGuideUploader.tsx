import React, { useState } from "react";
import { FileUp, Trash2, CheckCircle2, AlertTriangle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { extractTaxGuideData, ExtractedTaxData } from "@/utils/pdfParser";

interface TaxGuideUploaderProps {
  empresas: any[];
  onConfirm: (data: ProcessingResult[]) => Promise<void>;
  onClose: () => void;
  competenciaFiltro?: string; // Para avisar se a guia é de outra competência
}

export interface ProcessingResult {
  id: string; // Random UI ID
  file: File;
  data: ExtractedTaxData | null;
  empresa: any | null;
  status: "processing" | "ready" | "error" | "not_found";
  error?: string;
  confirmed: boolean;
}

export const TaxGuideUploader: React.FC<TaxGuideUploaderProps> = ({ empresas, onConfirm, onClose, competenciaFiltro }) => {
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const newResults: ProcessingResult[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      data: null,
      empresa: null,
      status: "processing",
      confirmed: false
    }));

    setResults(prev => [...prev, ...newResults]);

    // Process each file
    for (const res of newResults) {
      try {
        const extracted = await extractTaxGuideData(res.file);
        
        // Match with empresa by CNPJ (remove formatting for comparison)
        const cleanCnpj = extracted.cnpj?.replace(/\D/g, "");
        const empresa = empresas.find(e => e.cnpj?.replace(/\D/g, "") === cleanCnpj);

        setResults(prev => prev.map(item => 
          item.id === res.id 
            ? { 
                ...item, 
                data: extracted, 
                empresa, 
                status: empresa ? "ready" : "not_found",
                confirmed: !!empresa 
              } 
            : item
        ));
      } catch (err) {
        setResults(prev => prev.map(item => 
          item.id === res.id ? { ...item, status: "error", error: "Falha ao ler PDF" } : item
        ));
      }
    }
  };

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    const toConfirm = results.filter(r => r.confirmed && r.status === "ready");
    if (toConfirm.length === 0) {
      toast.error("Nenhuma guia válida selecionada para salvar.");
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(toConfirm);
      toast.success(`${toConfirm.length} guias processadas com sucesso!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar guias.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-card-foreground">Importar Guias Automáticas</h2>
              <p className="text-xs text-muted-foreground font-medium">Arraste seus arquivos PDF do e-CAC ou clique para selecionar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <XCircle size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dropzone */}
          <div className="border-2 border-dashed border-primary/20 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="p-4 bg-background rounded-full shadow-sm group-hover:scale-110 transition-transform">
              <FileUp size={32} className="text-primary" />
            </div>
            <p className="text-sm font-bold text-primary tracking-tight">Clique ou arraste arquivos aqui</p>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Apenas arquivos PDF (.pdf)</p>
          </div>

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1 flex justify-between">
                <span>Resultados da Extração ({results.length})</span>
                <span className="text-primary hover:underline cursor-pointer" onClick={() => setResults([])}>Limpar tudo</span>
              </h3>
              
              <div className="space-y-2">
                {results.map((res) => (
                  <div key={res.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${res.status === 'ready' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-card'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {res.status === 'processing' && <Loader2 size={16} className="text-primary animate-spin" />}
                        {res.status === 'ready' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {res.status === 'not_found' && <AlertTriangle size={16} className="text-warning" />}
                        {res.status === 'error' && <XCircle size={16} className="text-destructive" />}
                        <span className="text-xs font-black truncate max-w-[200px]">{res.file.name}</span>
                      </div>
                      
                      {res.data && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground/60">CNPJ</p>
                            <p className="text-[11px] font-bold">{res.data.cnpj || "???"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-black text-muted-foreground/60">Competência</p>
                            <p className={`text-[11px] font-bold ${competenciaFiltro && res.data.competencia && res.data.competencia.slice(3, 7) + '-' + res.data.competencia.slice(0, 2) !== competenciaFiltro ? 'text-destructive' : ''}`}>
                              {res.data.competencia || "???"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase font-black text-muted-foreground/60">Empresa Identificada</p>
                            <p className={`text-[11px] font-bold truncate ${!res.empresa ? 'text-destructive italic' : ''}`}>
                              {res.empresa?.nome_empresa || "Empresa não cadastrada"}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {res.error && <p className="text-[10px] text-destructive font-bold mt-1">{res.error}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {res.status === 'ready' && (
                        <button 
                          onClick={() => setResults(prev => prev.map(r => r.id === res.id ? { ...r, confirmed: !r.confirmed } : r))}
                          className={`p-2 rounded-xl transition-all ${res.confirmed ? 'bg-emerald-500 text-white shadow-lg' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => removeResult(res.id)}
                        className="p-2 hover:bg-destructive/10 rounded-xl text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex flex-col">
            <span className="font-bold">{results.filter(r => r.status === 'ready').length} guias identificadas</span>
            <span>{results.filter(r => r.confirmed && r.status === 'ready').length} selecionadas para confirmar</span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold bg-background border border-border hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || results.filter(r => r.confirmed && r.status === 'ready').length === 0}
              className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-black bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Confirmar e Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
