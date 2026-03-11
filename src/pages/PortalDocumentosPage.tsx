import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Search, Filter, Folder, File, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/PageSkeleton";

const PortalDocumentosPage: React.FC = () => {
    const { userData } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch documents from various sources (Simplified for portal)
    // In a real scenario, this would probably be a specific 'documentos' table
    // For now, let's show documents from 'licencas', 'certidoes' and 'declaracoes'
    const { data: documentos, isLoading } = useQuery({
        queryKey: ["portal_documentos", userData?.empresaId],
        queryFn: async () => {
            if (!userData?.empresaId) return [];
            
            // Fetch Licenças
            const { data: licencas } = await supabase.from("licencas").select("id, tipo_licenca, numero_processo, created_at").eq("empresa_id", userData.empresaId);
            
            // Fetch Certidões
            const { data: certidoes } = await supabase.from("certidoes").select("id, tipo_certidao, arquivo_url, created_at").eq("empresa_id", userData.empresaId);
            
            const docs = [
                ...(licencas || []).map((l: any) => ({ id: l.id, nome: `Licença: ${l.tipo_licenca}`, info: l.numero_processo, url: null, data: l.created_at, tipo: 'Licença' })),
                ...(certidoes || []).map((c: any) => ({ id: c.id, nome: `Certidão: ${c.tipo_certidao}`, info: '', url: c.arquivo_url, data: c.created_at, tipo: 'Certidão' }))
            ];
            
            return docs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        },
        enabled: !!userData?.empresaId
    });

    const filteredDocs = documentos?.filter(doc => 
        doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-foreground tracking-tight">Meus Documentos</h1>
                    <p className="text-sm text-muted-foreground font-medium">Acesse as licenças, certidões e declarações da sua empresa.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar documentos..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                </div>
            </div>

            {isLoading ? (
                <TableSkeleton rows={6} />
            ) : !filteredDocs || filteredDocs.length === 0 ? (
                <div className="module-card flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Folder size={32} className="text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="font-bold text-foreground">Nenhum documento disponível</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">Os documentos disponibilizados pela contabilidade aparecerão aqui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map((doc, idx) => (
                        <div key={idx} className="module-card group hover:border-primary/50 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    <FileText size={24} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                                    {doc.tipo}
                                </span>
                            </div>
                            <h3 className="font-bold text-foreground line-clamp-1 mb-1" title={doc.nome}>{doc.nome}</h3>
                            <p className="text-xs text-muted-foreground mb-4">{doc.info || doc.tipo}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {format(new Date(doc.data), 'dd/MM/yyyy')}
                                </span>
                                {doc.url ? (
                                    <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-xs font-black text-primary hover:underline group-hover:translate-x-0.5 transition-transform"
                                    >
                                        <Download size={14} /> DOWNLOAD
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Arquivo indisponível</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortalDocumentosPage;
