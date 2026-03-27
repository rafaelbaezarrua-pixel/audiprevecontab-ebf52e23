import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, Search, Folder, File, ShieldCheck, Clock, FileSignature, CheckCircle2, AlertCircle, Upload, FileCode, Plus, ClipboardList } from "lucide-react";
import { format, isAfter } from "date-fns";
import { TableSkeleton } from "@/components/PageSkeleton";
import { serproApi } from "@/lib/serpro";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PortalDocumentosPage: React.FC = () => {
    const { userData } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [signingId, setSigningId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch documents from various sources (Simplified for portal)
    // In a real scenario, this would probably be a specific 'documentos' table
    // For now, let's show documents from 'licencas', 'certidoes' and 'declaracoes'
    const { data: documentos, isLoading } = useQuery({
        queryKey: ["portal_documentos_v2", userData?.empresaId],
        queryFn: async () => {
            if (!userData?.empresaId) return [];
            
            const { data: assinaturas } = await supabase
                .from("documentos_assinaturas")
                .select("*")
                .eq("empresa_id", userData.empresaId);

            const { data: licencas } = await supabase.from("licencas").select("id, tipo_licenca, numero_processo, created_at").eq("empresa_id", userData.empresaId);
            const { data: certidoes } = await supabase.from("certidoes").select("id, tipo_certidao, arquivo_url, created_at").eq("empresa_id", userData.empresaId);
            
            const docs = [
                ...(assinaturas || []).map((s: any) => ({ 
                    id: s.id, 
                    nome: s.titulo, 
                    info: 'Exige Assinatura Digital', 
                    url: s.file_url, 
                    data: s.created_at, 
                    tipo: 'Assinatura',
                    status: s.status,
                    pkcs7: s.assinatura_pkcs7
                })),
                ...(licencas || []).map((l: any) => ({ id: l.id, nome: `Licença: ${l.tipo_licenca}`, info: l.numero_processo, url: null, data: l.created_at, tipo: 'Licença' })),
                ...(certidoes || []).map((c: any) => ({ id: c.id, nome: `Certidão: ${c.tipo_certidao}`, info: '', url: c.arquivo_url, data: c.created_at, tipo: 'Certidão' }))
            ];
            
            return docs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        },
        enabled: !!userData?.empresaId
    });

    const { data: solicitacoes, isLoading: isLoadingSoli } = useQuery({
        queryKey: ["portal_solicitacoes", userData?.empresaId],
        queryFn: async () => {
            if (!userData?.empresaId) return [];
            const { data, error } = await supabase
                .from("document_requests")
                .select("*")
                .eq("empresa_id", userData.empresaId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!userData?.empresaId
    });

    const uploadFulfillmentMutation = useMutation({
        mutationFn: async ({ requestId, file }: { requestId: string, file: File }) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `solicitacoes/${userData?.empresaId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documentos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('documentos')
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('document_requests')
                .update({
                    document_url: publicUrl,
                    status: 'entregue'
                })
                .eq('id', requestId);

            if (dbError) throw dbError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal_solicitacoes"] });
            toast.success("Documento enviado com sucesso!");
        },
        onError: (error: any) => toast.error("Falha no envio: " + error.message)
    });

    const signMutation = useMutation({
        mutationFn: async (doc: any) => {
            setSigningId(doc.id);
            toast.info("Conectando ao Assinador Serpro...", { description: "Certifique-se que o aplicativo está aberto na sua máquina." });
            
            try {
                // 1. Conecta ao WebSocket local
                await serproApi.connect();
                
                // 2. Transforma o PDF em Base64 para o Serpro processar
                // Idealmente, pediríamos um hash, mas para simplicidade faremos o download e conversão
                const response = await fetch(doc.url);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                // 3. Solicita a assinatura (O cliente verá o popup do Serpro pedindo o PIN)
                const signaturePkcs7 = await serproApi.sign(base64, 'file');

                // 4. Salva no banco
                const { error } = await supabase
                    .from('documentos_assinaturas')
                    .update({
                        status: 'assinado',
                        assinatura_pkcs7: signaturePkcs7,
                        data_assinatura: new Date().toISOString()
                    })
                    .eq('id', doc.id);

                if (error) throw error;
                return true;
            } catch (err: any) {
                console.error(err);
                throw new Error(err.message || "Falha ao assinar documento");
            } finally {
                setSigningId(null);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portal_documentos_v2"] });
            toast.success("Documento assinado com sucesso!", { description: "A validade jurídica foi registrada no sistema." });
        },
        onError: (error: any) => {
            toast.error("Erro na assinatura", { description: error.message });
        }
    });

    const filteredDocs = documentos?.filter(doc => 
        doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendentes = filteredDocs?.filter(d => d.tipo === 'Assinatura' && d.status === 'pendente') || [];
    const outros = filteredDocs?.filter(d => d.tipo !== 'Assinatura' || d.status === 'assinado') || [];

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

            <Tabs defaultValue="todos" className="w-full">
                <TabsList className="bg-muted/50 p-1 mb-6">
                    <TabsTrigger value="todos">Todos</TabsTrigger>
                    <TabsTrigger value="pendentes" className="relative">
                        Assinaturas
                        {pendentes.length > 0 && (
                            <span className="ml-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                {pendentes.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="solicitacoes" className="relative gap-2">
                        <ClipboardList size={14} /> Solicitações
                        {(solicitacoes?.filter((s:any) => s.status === 'pendente').length || 0) > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {solicitacoes?.filter((s:any) => s.status === 'pendente').length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="xml" className="flex items-center gap-2">
                        <FileCode size={14} /> Importar XML
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="todos">
                    {isLoading ? (
                        <TableSkeleton rows={6} />
                    ) : !filteredDocs || filteredDocs.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDocs.map((doc, idx) => (
                                <DocCard 
                                    key={idx} 
                                    doc={doc} 
                                    onSign={() => signMutation.mutate(doc)} 
                                    isSigning={signingId === doc.id} 
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="pendentes">
                    {pendentes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border rounded-3xl border-dashed">
                            <ShieldCheck size={48} className="text-muted-foreground opacity-20 mb-4" />
                            <h3 className="font-bold text-foreground">Tudo em dia!</h3>
                            <p className="text-sm text-muted-foreground mt-1">Você não possui documentos aguardando sua assinatura.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendentes.map((doc, idx) => (
                                <DocCard 
                                    key={idx} 
                                    doc={doc} 
                                    onSign={() => signMutation.mutate(doc)} 
                                    isSigning={signingId === doc.id} 
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="solicitacoes">
                    {isLoadingSoli ? (
                        <TableSkeleton rows={4} />
                    ) : !solicitacoes || solicitacoes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border rounded-3xl border-dashed">
                            <ClipboardList size={48} className="text-muted-foreground opacity-20 mb-4" />
                            <h3 className="font-bold text-foreground">Sem solicitações</h3>
                            <p className="text-sm text-muted-foreground mt-1">A contabilidade não solicitou nenhum documento no momento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {solicitacoes.map((sol: any) => (
                                <div key={sol.id} className={`module-card relative overflow-hidden transition-all ${
                                    sol.status === 'pendente' ? 'border-orange-200 bg-orange-50/5' : 'opacity-75'
                                }`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-2xl ${
                                            sol.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                        }`}>
                                            <FileText size={24} />
                                        </div>
                                        <Badge className={sol.status === 'pendente' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}>
                                            {sol.status === 'pendente' ? 'Aguardando' : 'Entregue'}
                                        </Badge>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{sol.titulo}</h3>
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{sol.descricao}</p>
                                    
                                    <div className="flex items-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        <Clock size={12} /> Vencimento: {sol.data_vencimento ? format(new Date(sol.data_vencimento), 'dd/MM/yyyy') : 'Não definido'}
                                    </div>

                                    {sol.status === 'pendente' ? (
                                        <label className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                                            <Upload size={18} /> Enviar Documento
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) uploadFulfillmentMutation.mutate({ requestId: sol.id, file });
                                                }}
                                            />
                                        </label>
                                    ) : (
                                        <Button variant="outline" className="w-full gap-2 border-green-500/30 text-green-600 hover:bg-green-500/5" onClick={() => window.open(sol.document_url, '_blank')}>
                                            <CheckCircle2 size={18} /> Ver Documento Enviado
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="xml">
                    <div className="module-card border-dashed border-2 p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                        <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                            <Upload size={40} />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Importar Notas Fiscais (XML)</h2>
                        <p className="text-muted-foreground text-sm max-w-md mb-8">
                            Arraste seus arquivos XML de entrada ou saída para cá, ou clique no botão abaixo para selecionar.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="cursor-pointer px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                <Plus size={18} /> Selecionar Arquivos
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".xml" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files?.length) {
                                            toast.success(`${e.target.files.length} arquivos selecionados para processamento.`);
                                            // Here we would implement the upload to Supabase Storage
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        
                        <div className="mt-12 w-full max-w-2xl text-left border-t border-border pt-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Dicas Importantes</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex gap-3">
                                    <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                                    <p className="text-xs text-muted-foreground line-height-relaxed">Formatos aceitos: NF-e, NFS-e e CT-e (apenas .xml)</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="mt-1"><CheckCircle2 size={14} className="text-green-500" /></div>
                                    <p className="text-xs text-muted-foreground line-height-relaxed">Envie as notas fiscais até o dia 05 de cada mês.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

const EmptyState = () => (
    <div className="module-card flex flex-col items-center justify-center py-16 text-center border-dashed border-2">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Folder size={32} className="text-muted-foreground opacity-20" />
        </div>
        <h3 className="font-bold text-foreground">Nenhum documento disponível</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">Os documentos disponibilizados pela contabilidade aparecerão aqui.</p>
    </div>
);

const DocCard = ({ doc, onSign, isSigning }: { doc: any, onSign: () => void, isSigning: boolean }) => (
    <div className={`module-card group hover:border-primary/50 transition-all ${doc.status === 'pendente' ? 'border-orange-200 bg-orange-50/10' : ''}`}>
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${doc.status === 'pendente' ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'} shadow-inner`}>
                <FileText size={24} />
            </div>
            <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                doc.tipo === 'Assinatura' ? 'border-orange-500 text-orange-600' : ''
            }`}>
                {doc.tipo}
            </Badge>
        </div>
        <h3 className="font-bold text-foreground line-clamp-1 mb-1" title={doc.nome}>{doc.nome}</h3>
        <p className="text-xs text-muted-foreground mb-4">{doc.info || doc.tipo}</p>
        
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground">
                    {format(new Date(doc.data), 'dd/MM/yyyy')}
                </span>
                {doc.status === 'assinado' && (
                    <span className="text-[9px] text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} /> ASSINADO e-CNPJ
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {doc.url && (
                    <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-primary transition-colors"
                        title="Visualizar PDF"
                    >
                        <Download size={14} />
                    </a>
                )}
                
                {doc.tipo === 'Assinatura' && doc.status === 'pendente' && (
                    <Button 
                        size="sm" 
                        onClick={onSign} 
                        disabled={isSigning}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-8 text-[11px] gap-1 px-3"
                    >
                        {isSigning ? (
                            <Clock className="w-3 h-3 animate-spin" />
                        ) : (
                            <FileSignature className="w-3 h-3" />
                        )}
                        {isSigning ? "ASSINANDO..." : "ASSINAR AGORA"}
                    </Button>
                )}
            </div>
        </div>
    </div>
);

export default PortalDocumentosPage;
