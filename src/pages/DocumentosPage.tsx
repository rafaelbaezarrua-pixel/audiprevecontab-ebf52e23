import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSignature, UploadCloud, File, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ClipboardList, Plus, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { lacunaApi, Certificate } from "@/lib/lacuna";
import PdfSignPositioner from "@/components/PdfSignPositioner";

const DocumentosPage = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [isSigning, setIsSigning] = useState<string | null>(null);
  const [shouldSignAfterUpload, setShouldSignAfterUpload] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<string>("");
  const [isCertDialogOpen, setIsCertDialogOpen] = useState(false);
  const handleCertDialogChange = (open: boolean) => {
    setIsCertDialogOpen(open);
    if (!open) {
      setPfxFile(null);
      setPfxPassword("");
      setSignCoords(null);
      setShowPositioner(false);
    }
  };
  const [docToSign, setDocToSign] = useState<any>(null);
  
  // Novos estados para Assinatura PFX (Backend)
  const [signingMethod, setSigningMethod] = useState<'lacuna' | 'pfx'>('pfx');
  const [pfxFile, setPfxFile] = useState<File | null>(null);
  const [pfxPassword, setPfxPassword] = useState('');
  const [showPfxPassword, setShowPfxPassword] = useState(false);
  const [signCoords, setSignCoords] = useState<{ x: number; y: number; pageIndex: number } | null>(null);
  const [showPositioner, setShowPositioner] = useState(false);
  const queryClient = useQueryClient();

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas').select('id, nome_empresa').order('nome_empresa');
      if (error) throw error;
      return data;
    }
  });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['documentos_assinaturas'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('documentos_assinaturas' as any)
        .select(`*, empresas (nome_empresa)`)
        .order('created_at', { ascending: false }) as any);
      if (error && error.code !== '42P01') throw error;
      return data || [];
    }
  });

  const { data: solicitacoes = [], isLoading: isLoadingSoli } = useQuery({
    queryKey: ['document_requests'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('document_requests' as any)
        .select(`*, empresas (nome_empresa)`)
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data || [];
    }
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
        if (!empresaId || !titulo) throw new Error("Preencha empresa e título");
        const { error } = await supabase.from('document_requests' as any).insert({
            empresa_id: empresaId,
            titulo,
            descricao,
            data_vencimento: dataVencimento || null,
            status: 'pendente'
        });
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['document_requests'] });
        toast.success("Solicitação enviada!");
        setIsRequestOpen(false);
        setTitulo("");
        setDescricao("");
        setDataVencimento("");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !titulo) throw new Error("Preencha o título e selecione um arquivo");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const pathEmpresa = empresaId && empresaId !== 'geral' ? empresaId : 'geral';
      const filePath = `assinaturas/${pathEmpresa}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath);

      const { data, error: dbError } = await supabase
        .from('documentos_assinaturas' as any)
        .insert({
          empresa_id: (!empresaId || empresaId === 'geral') ? null : empresaId,
          titulo,
          file_url: publicUrl,
          status: 'pendente',
          tipo_documento: 'Geral'
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    },
    onSuccess: (newDoc: any) => {
      queryClient.invalidateQueries({ queryKey: ['documentos_assinaturas'] });
      toast.success("Documento enviado!");
      setIsUploadOpen(false);
      setFile(null);
      setTitulo("");
      
      if (shouldSignAfterUpload && newDoc) {
        startSigning(newDoc);
        setShouldSignAfterUpload(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao fazer upload");
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documentos_assinaturas' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_assinaturas'] });
      toast.success("Documento excluído com sucesso!");
    },
    onError: (error: any) => toast.error("Erro ao excluir: " + error.message)
  });

  const handleDeleteDoc = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este documento?")) {
      deleteDocMutation.mutate(id);
    }
  };

  const startSigning = async (doc: any) => {
    setDocToSign(doc);
    setIsSigning(doc.id);
    try {
      const certs = await lacunaApi.listCertificates();
      setCertificates(certs);
      setIsCertDialogOpen(true);
    } catch (err: any) {
      toast.error("Erro ao listar certificados", { description: err.message });
    } finally {
      setIsSigning(null);
    }
  };

  const signMutation = useMutation({
    mutationFn: async ({ doc, method, certId, pfxData, pfxPass, coords }: { doc: any, method: 'pfx' | 'lacuna', certId?: string, pfxData?: File | null, pfxPass?: string, coords?: any }) => {
      setIsSigning(doc.id);
      const finalMethod = method || signingMethod;
      console.log(`[Documentos] Iniciando assinatura. Método: ${finalMethod}, CertID: ${certId || 'N/A'}`);
      
      try {
        toast.info("Processando assinatura digital...");
        
        // 1. Get file as base64 - Validando se a URL é acessível
        const response = await fetch(doc.file_url);
        if (!response.ok) {
          throw new Error(`Não foi possível baixar o PDF para assinar (Erro ${response.status}). Verifique se o arquivo ainda existe.`);
        }
        const blob = await response.blob();
        
        // Garantir que é um PDF mesmo
        if (blob.type !== 'application/pdf' && !doc.file_url.includes('.pdf')) {
          console.warn("Tipo de arquivo suspeito:", blob.type);
        }

        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!result) return reject(new Error("Falha ao ler o conteúdo do PDF."));
            // Pegar apenas a parte Base64 (após a vírgula)
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Erro na leitura do arquivo PDF."));
          reader.readAsDataURL(blob);
        });

        console.log('[Documentos] PDF carregado para assinatura. Tamanho Base64:', pdfBase64.length);

        let signedPdfBase64 = "";
        
        if (finalMethod === 'pfx') {
          // --- ASSINATURA VIA BACKEND (PFX) ---
          if (!pfxData || !pfxPass) throw new Error("Certificado PFX ou senha não fornecidos");
          
          const pfxBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (!result) return reject(new Error("Falha ao ler o certificado PFX."));
              resolve(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.onerror = () => reject(new Error("Erro na leitura do arquivo PFX."));
            reader.readAsDataURL(pfxData);
          });

          console.log('[Documentos] Enviando para backend. Tamanhos:', { pdf: pdfBase64.length, pfx: pfxBase64.length });

          const apiUrl = import.meta.env.DEV ? 'http://localhost:3000/api/sign-pdf' : '/api/sign-pdf';
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64,
              pfxBase64,
              passphrase: pfxPass,
              visualText: `Assinado digitalmente por Audipreve\nData: ${new Date().toLocaleString('pt-BR')}`,
              x: coords?.x,
              y: coords?.y,
              pageIndex: coords?.pageIndex
            })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.details || data.error || "Erro no servidor de assinatura");
          signedPdfBase64 = data.signedPdfBase64;

        } else {
          // --- ASSINATURA VIA LACUNA (LOCAL) ---
          if (!certId) throw new Error("Certificado não selecionado");
          signedPdfBase64 = await lacunaApi.signPdf(certId, pdfBase64, { 
            visual: true, 
            coords 
          });
        }
        
        // 2. Converter resultado para Blob e upload
        const byteCharacters = atob(signedPdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const signedBlob = new Blob([byteArray], { type: 'application/pdf' });

        const filePath = `assinados/${doc.id}-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, signedBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);
        
        const finalFileUrl = publicUrl;

        // 3. Atualizar banco de dados
        const { error: updateError } = await supabase
          .from('documentos_assinaturas' as any)
          .update({
            status: 'assinado',
            file_url: finalFileUrl,
            data_assinatura: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (updateError) throw updateError;
      } catch (err: any) {
        console.error(err);
        throw new Error(err.message || "Falha ao assinar documento");
      } finally {
        setIsSigning(null);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_assinaturas'] });
      toast.success("Documento assinado com sucesso!");
      setIsCertDialogOpen(false);
      setSelectedCert("");
      setDocToSign(null);
      setPfxFile(null);
      setPfxPassword("");
    },
    onError: (error: any) => {
      toast.error("Erro na assinatura", { description: error.message });
      setPfxPassword(""); // Limpar senha imediatamente em caso de erro
    }
  });

  const DownloadPKCS7 = (base64Signature: string, titulo: string) => {
    const byteCharacters = atob(base64Signature);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pkcs7-signature' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo}-assinatura.p7s`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFinalSign = (certId?: string) => {
    if (certId) setSelectedCert(certId);
    
    if (docToSign) {
      if (!signCoords) {
        setShowPositioner(true);
        return;
      }

      signMutation.mutate({ 
        doc: docToSign, 
        method: signingMethod,
        certId: certId || selectedCert, 
        pfxData: pfxFile, 
        pfxPass: pfxPassword,
        coords: signCoords || (docToSign as any).tempCoords
      });
      setSignCoords(null);
      if ((docToSign as any).tempCoords) delete (docToSign as any).tempCoords;
    }
  };

  return (
      <Tabs defaultValue="assinaturas" className="w-full">
        <TabsList className="mb-4">
            <TabsTrigger value="assinaturas" className="gap-2"><FileSignature className="w-4 h-4" /> Assinador Digital</TabsTrigger>
            <TabsTrigger value="solicitacoes" className="gap-2"><ClipboardList className="w-4 h-4" /> Solicitações de Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="assinaturas">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Assinador Digital Lacuna</CardTitle>
                        <CardDescription>
                            Assine documentos com seu certificado digital local. 
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isCertDialogOpen} onOpenChange={handleCertDialogChange}>
                            <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Assinar Documento</DialogTitle>
                                    <DialogDescription className="text-[10px] text-muted-foreground">Escolha o método de assinatura e posicione o carimbo no PDF.</DialogDescription>
                                </DialogHeader>
                                
                                {showPositioner ? (
                                    <div className="h-[600px] mt-4">
                                        <PdfSignPositioner 
                                            fileUrl={docToSign?.file_url} 
                                            onCancel={() => setShowPositioner(false)}
                                            onSelection={(coords) => {
                                                setSignCoords(coords);
                                                setShowPositioner(false);
                                                // Chama o handleFinalSign novamente com os dados preservados
                                                signMutation.mutate({ 
                                                    doc: docToSign, 
                                                    method: signingMethod,
                                                    certId: selectedCert, 
                                                    pfxData: pfxFile, 
                                                    pfxPass: pfxPassword,
                                                    coords
                                                });
                                                setSignCoords(null);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <Tabs value={signingMethod} onValueChange={(v: any) => setSigningMethod(v)} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="pfx">Arquivo PFX (A1)</TabsTrigger>
                                        <TabsTrigger value="lacuna">Token / Certificado Local</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="lacuna" className="space-y-4">
                                        <p className="text-xs text-muted-foreground">Requer extensão Lacuna Web PKI instalada. Ideal para Tokens (A3).</p>
                                        <div className="space-y-2 overflow-y-auto pr-1 max-h-[40vh] scrollbar-thin scrollbar-thumb-gray-300">
                                            {certificates.length === 0 ? (
                                                <div className="text-center py-4 text-orange-600 font-medium italic text-sm">Nenhum certificado encontrado. Verifique seu Assinador.</div>
                                            ) : (
                                                certificates.map((cert) => (
                                                    <Button 
                                                        key={cert.id} 
                                                        variant="outline" 
                                                        className="w-full justify-start text-left h-auto py-3 px-4 border-orange-100 hover:border-orange-500 hover:bg-orange-50"
                                                        onClick={() => {
                                                            setSelectedCert(cert.id);
                                                            handleFinalSign(cert.id);
                                                        }}
                                                        disabled={signMutation.isPending}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{cert.name}</span>
                                                            <span className="text-[10px] text-gray-400 mt-1 uppercase">Vencimento: {new Date(cert.expirationDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </Button>
                                                ))
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={async () => setCertificates(await lacunaApi.listCertificates())}>Atualizar Lista</Button>
                                    </TabsContent>

                                    <TabsContent value="pfx" className="space-y-4">
                                        <p className="text-xs text-muted-foreground">Assine direto pelo servidor usando seu arquivo de certificado A1.</p>
                                        
                                        <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold">Arquivo .pfx ou .p12</Label>
                                                <Input 
                                                    type="file" 
                                                    accept=".pfx,.p12" 
                                                    className="bg-white"
                                                    onChange={(e) => setPfxFile(e.target.files?.[0] || null)} 
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold">Senha do Certificado</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type={showPfxPassword ? "text" : "password"} 
                                                        value={pfxPassword}
                                                        placeholder="Digite a senha"
                                                        className="bg-white pr-10"
                                                        onChange={(e) => setPfxPassword(e.target.value)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                        onClick={() => setShowPfxPassword(!showPfxPassword)}
                                                    >
                                                        {showPfxPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button 
                                                className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold h-11"
                                                onClick={() => handleFinalSign()}
                                                disabled={!pfxFile || !pfxPassword || signMutation.isPending}
                                            >
                                                {signMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSignature className="w-4 h-4 mr-2" />}
                                                ESCOLHER LOCAL E ASSINAR
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-center text-gray-400 italic">Sessão Volátil: Seu certificado não é armazenado no servidor.</p>
                                    </TabsContent>
                                    </Tabs>
                                )}
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2" size="sm">
                                    <Plus className="h-4 w-4" /> Novo Documento
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Assinar Novo Documento</DialogTitle>
                                    <DialogDescription>Selecione um arquivo PDF para iniciar o processo de assinatura.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Empresa / Referência (Opcional)</Label>
                                        <Select value={empresaId} onValueChange={setEmpresaId}>
                                            <SelectTrigger><SelectValue placeholder="Selecione ou deixe em branco" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="geral">Geral / Sem Empresa</SelectItem>
                                                {empresas.map((emp) => (
                                                    <SelectItem key={emp.id} value={emp.id}>{emp.nome_empresa}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Título do Documento</Label>
                                        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Contrato Social" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Arquivo PDF</Label>
                                        <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="w-full" disabled={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
                                            {uploadMutation.isPending ? "Enviando..." : "SÓ ENVIAR"}
                                        </Button>
                                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" disabled={uploadMutation.isPending} onClick={() => {
                                            setShouldSignAfterUpload(true);
                                            uploadMutation.mutate();
                                        }}>
                                            <FileSignature className="w-4 h-4 mr-2" /> ENVIAR E ASSINAR
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Empresa / Ref</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
                                ) : documentos.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum documento.</TableCell></TableRow>
                                ) : (
                                    documentos.map((doc: any) => (
                                        <TableRow key={doc.id}>
                                            <TableCell className="font-bold">{doc.titulo}</TableCell>
                                            <TableCell>{doc.empresas?.nome_empresa}</TableCell>
                                            <TableCell>{format(new Date(doc.created_at), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                {doc.status === 'pendente' && <Badge variant="outline" className="text-orange-500">Pendente</Badge>}
                                                {doc.status === 'assinado' && <Badge variant="outline" className="text-green-500">Assinado</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(doc.file_url, '_blank')} title="Ver PDF Original"><File className="w-4 h-4 mr-1" /> PDF</Button>
                                                    
                                                    {doc.status === 'assinado' && doc.assinatura_pkcs7 && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="border-green-500/30 text-green-600 hover:bg-green-500/5 items-center inline-flex"
                                                            onClick={() => DownloadPKCS7(doc.assinatura_pkcs7, doc.titulo)}
                                                        >
                                                            <Download className="w-4 h-4 mr-1" /> .p7s
                                                        </Button>
                                                    )}

                                                    {doc.status === 'pendente' && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => startSigning(doc)}
                                                            disabled={!!isSigning}
                                                            className="bg-orange-600 hover:bg-orange-700 text-white gap-2 font-bold"
                                                        >
                                                            {isSigning === doc.id ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <FileSignature className="w-3 h-3" />
                                                            )}
                                                            Assinar
                                                        </Button>
                                                    )}

                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="solicitacoes">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Solicitações de Documentos</CardTitle>
                        <CardDescription>Peça documentos específicos para os clientes.</CardDescription>
                    </div>
                    <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" variant="outline" size="sm">
                                <Plus className="h-4 w-4" /> Nova Solicitação
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Solicitação</DialogTitle>
                                <DialogDescription>Crie um pedido de documento para que seu cliente possa enviá-lo.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Empresa / Cliente</Label>
                                    <Select value={empresaId} onValueChange={setEmpresaId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                                        <SelectContent>
                                            {empresas.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.nome_empresa}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>O que você precisa?</Label>
                                    <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Extrato Bancário Jan/2026" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Instruções (Opcional)</Label>
                                    <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Favor enviar em formato PDF ou OFX" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data Limite</Label>
                                    <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
                                </div>
                                <Button className="w-full" disabled={requestMutation.isPending} onClick={() => requestMutation.mutate()}>
                                    {requestMutation.isPending ? "Enviando..." : "Enviar Solicitação"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Arquivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSoli ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4">Carregando...</TableCell></TableRow>
                                ) : solicitacoes.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma solicitação ativa.</TableCell></TableRow>
                                ) : (
                                    solicitacoes.map((sol: any) => (
                                        <TableRow key={sol.id}>
                                            <TableCell>
                                                <div className="font-bold">{sol.titulo}</div>
                                                <div className="text-xs text-muted-foreground">{sol.descricao}</div>
                                            </TableCell>
                                            <TableCell>{sol.empresas?.nome_empresa}</TableCell>
                                            <TableCell>{sol.data_vencimento ? format(new Date(sol.data_vencimento), 'dd/MM/yyyy') : '-'}</TableCell>
                                            <TableCell>
                                                {sol.status === 'pendente' && <Badge variant="outline" className="text-orange-500">Aguardando</Badge>}
                                                {sol.status === 'entregue' && <Badge variant="outline" className="text-green-500">Entregue</Badge>}
                                                {sol.status === 'arquivado' && <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {sol.document_url ? (
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(sol.document_url, '_blank')}>Ver Arquivo</Button>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
  );
};

export default DocumentosPage;
