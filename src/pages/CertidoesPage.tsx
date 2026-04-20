import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Building2, FileText, Upload, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { CertidaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { ModuleFolderView } from "@/components/ModuleFolderView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen } from "lucide-react";

const tiposCertidao = ["CND Federal", "CND Estadual", "CND Municipal", "CND FGTS", "CND Trabalhista", "CNDT", "Certidão INSS", "Certidão Tributos Federais", "Outra"];
const calcDias = (data?: string | null) => { if (!data) return 999; return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); };

const CertidoesPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("certidoes");
  const [certidoes, setCertidoes] = useState<CertidaoRecord[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newCert, setNewCert] = useState({ tipo_certidao: "CND Federal", vencimento: "", observacao: "" });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [consulting, setConsulting] = useState<string | null>(null);
  const [cndTipoPessoa, setCndTipoPessoa] = useState<"PJ" | "PF">("PJ");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: certs } = await supabase.from("certidoes").select("*");
    setCertidoes(certs || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = empresas.filter(e => e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search));

  const uploadFile = async (certId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${certId}.${ext}`;
    setUploading(certId);
    const { error: uploadError } = await supabase.storage.from("certidoes").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erro ao enviar arquivo: " + uploadError.message); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("certidoes").getPublicUrl(path);
    await supabase.from("certidoes").update({ arquivo_url: urlData.publicUrl }).eq("id", certId);
    toast.success("Arquivo anexado!");
    setUploading(null);
    load();
  };

  const handleFileUpload = (certId: string) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(certId, file);
      input.value = "";
    };
    input.click();
  };

  const addCertidao = async (empresaId: string) => {
    if (!newCert.tipo_certidao) { toast.error("Selecione o tipo"); return; }
    const { data, error } = await supabase.from("certidoes").insert({ empresa_id: empresaId, tipo_certidao: newCert.tipo_certidao, vencimento: newCert.vencimento || null, observacao: newCert.observacao || null }).select().single();
    if (error) { toast.error(error.message); return; }
    if (newFile && data) {
      await uploadFile(data.id, newFile);
      setNewFile(null);
      if (newFileInputRef.current) newFileInputRef.current.value = "";
    } else {
      toast.success("Certidão adicionada!");
    }
    setNewCert({ tipo_certidao: "CND Federal", vencimento: "", observacao: "" });
    load();
  };

  const handleConsultaCND = async (empresaId: string, cnpj: string | undefined) => {
    setConsulting(empresaId);
    const tid = toast.loading(`Consultando CND Federal ${cndTipoPessoa}...`);

    try {
      let identificador = "";
      let tipoContribuinte = 1; // Default 1 (PJ)

      if (cndTipoPessoa === "PJ") {
        if (!cnpj) throw new Error("CNPJ da empresa não disponível.");
        identificador = cnpj.replace(/\D/g, "");
        tipoContribuinte = 1;
      } else {
        // PF - Buscar sócio administrador
        const { data: socios, error: socError } = await supabase.from("socios").select("*").eq("empresa_id", empresaId).eq("administrador", true);
        if (socError) throw socError;
        if (!socios || socios.length === 0) throw new Error("A empresa não possui um Sócio Administrador cadastrado para consulta PF.");
        
        const admin = socios[0];
        if (!admin.cpf) throw new Error(`O sócio administrador (${admin.nome}) não possui CPF cadastrado.`);
        identificador = admin.cpf.replace(/\D/g, "");
        tipoContribuinte = 2; // Serpro enum: 2 - CPF
      }

      const response = await fetch("https://apigateway.conectagov.estaleiro.serpro.gov.br/api-cnd/v1/ConsultaCnd/certidao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TipoContribuinte: tipoContribuinte,
          ContribuinteConsulta: identificador,
          GerarCertidaoPdf: true
        })
      });

      if (!response.ok) throw new Error("Erro na comunicação com a API de Certidões.");

      const data = await response.json();

      if (data.Status !== 1 && data.Status !== 2) {
        throw new Error(data.Mensagem || "Não foi possível obter a certidão.");
      }

      const certData = data.Certidao;
      if (!certData) throw new Error("Dados da certidão não retornados.");

      const { data: newRecord, error: insertError } = await supabase.from("certidoes").insert({
        empresa_id: empresaId,
        tipo_certidao: "CND Federal",
        vencimento: certData.DataValidade ? new Date(certData.DataValidade).toISOString().split('T')[0] : null,
        observacao: `Cód. Controle: ${certData.CodigoControle}${cndTipoPessoa === "PF" ? " (Sócio Admin)" : ""}`
      }).select().single();

      if (insertError) throw insertError;

      if (certData.DocumentoPdf) {
        const binStr = atob(certData.DocumentoPdf);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        const blob = new Blob([arr], { type: "application/pdf" });
        const fileName = `CND_Federal_${cndTipoPessoa}_${identificador}.pdf`;
        const file = new File([blob], fileName, { type: "application/pdf" });
        
        await uploadFile(newRecord.id, file);
      }

      toast.success(`CND Federal (${cndTipoPessoa}) consultada com sucesso!`, { id: tid });
      load();
    } catch (err: any) {
      toast.error(`Falha na consulta (${cndTipoPessoa}): ${err.message}`, { id: tid });
    } finally {
      setConsulting(null);
    }
  };

  const removeCertidao = async (certId: string) => {
    if (!window.confirm("Excluir certidão?")) return;
    // Try to remove file from storage
    const cert = certidoes.find(c => c.id === certId);
    if (cert?.arquivo_url) {
      const fileName = cert.arquivo_url.split("/").pop();
      if (fileName) await supabase.storage.from("certidoes").remove([fileName]);
    }
    await supabase.from("certidoes").delete().eq("id", certId);
    toast.success("Certidão excluída!"); load();
  };

  const viewFile = (url: string) => { window.open(url, "_blank"); };
  const downloadFile = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.click();
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-0">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-0">
        <div className="space-y-1 -mt-8">
          <div className="flex items-center gap-2">
             <h1 className="header-title">Gestão de <span className="text-primary/90 font-black">Certidões</span></h1>
             <FavoriteToggleButton moduleId="certidoes" />
          </div>
          <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Controle de CNDs Federais, Estaduais e Municipais.</p>
        </div>
      </div>

      <div className="relative w-full max-w-md group pb-2">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" size={14} />
        <input 
          placeholder="BUSCAR EMPRESA OU CNPJ..." 
          className="w-full h-10 pl-10 pr-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const empCerts = certidoes.filter(c => c.empresa_id === emp.id);
          const vencidas = empCerts.filter(c => calcDias(c.vencimento) < 0).length;
          
          return (
            <div key={emp.id} className={`group bg-card border rounded-2xl transition-all duration-200 overflow-hidden shadow-sm ${isOpen ? 'border-primary/40 ring-1 ring-primary/5' : 'border-border/40 hover:border-primary/20'}`}>
              <div 
                className={`flex items-center justify-between px-4 py-2 cursor-pointer transition-colors ${isOpen ? 'bg-primary/[0.03]' : 'hover:bg-primary/[0.01]'}`} 
                onClick={() => setExpanded(isOpen ? null : emp.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-black/5 dark:bg-white/5 border border-border/10 group-hover:border-primary/30 group-hover:text-primary'}`}>
                    <Building2 size={14} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-[11px] uppercase tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">{emp.nome_empresa}</span>
                    <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest font-mono">{emp.cnpj || "N/D"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3">
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">{empCerts.length} ITENS</span>
                    {vencidas > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/20 animate-pulse">
                        {vencidas} VENCIDAS
                      </span>
                    )}
                  </div>
                  <div className={`p-1.5 rounded-lg border transition-all ${isOpen ? 'bg-primary text-white border-primary rotate-180' : 'bg-black/5 dark:bg-white/5 text-muted-foreground/30 border-border/10 group-hover:bg-primary/5 group-hover:text-primary'}`}>
                    <ChevronDown size={12} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border/5 p-4 space-y-6 bg-black/[0.01] dark:bg-white/[0.01] animate-in slide-in-from-top-2 duration-200">
                  <Tabs defaultValue="dados" className="w-full">
                    <div className="flex items-center justify-between border-b border-border/5 pb-3 mb-4">
                      <TabsList className="bg-black/10 dark:bg-white/10 p-1 rounded-lg h-9 border border-border/10 shadow-inner">
                         <TabsTrigger value="dados" className="px-4 h-full text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm">Documentos</TabsTrigger>
                         <TabsTrigger value="pastas" className="px-4 h-full text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary shadow-sm">Drive / Pastas</TabsTrigger>
                      </TabsList>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <span className="w-1.5 h-3 bg-primary rounded-full" /> Detalhes Técnicos
                      </h3>
                    </div>

                    <TabsContent value="dados" className="space-y-6 animate-in fade-in duration-200 outline-none">
                  {empCerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {empCerts.map((c: CertidaoRecord) => {
                        const dias = calcDias(c.vencimento);
                        const isExpired = dias < 0;
                        const isNear = dias >= 0 && dias <= 30;
                        
                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card group/item hover:border-primary/20 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isExpired ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : isNear ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                <FileText size={14} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate max-w-[180px]">{c.tipo_certidao}</span>
                                <div className="flex items-center gap-2">
                                   <span className={`text-[8px] font-bold ${isExpired ? 'text-rose-500' : 'text-muted-foreground/50'}`}>
                                      {c.vencimento ? formatDateBR(c.vencimento) : "Pendente"}
                                   </span>
                                   {dias !== 999 && (
                                     <span className={`text-[8px] font-black px-1.5 rounded-md uppercase tracking-tighter ${isExpired ? 'bg-rose-500 text-white' : isNear ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                       {isExpired ? "Expirada" : `${dias}d`}
                                     </span>
                                   )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-20 group-hover/item:opacity-100 transition-opacity">
                              {c.arquivo_url ? (
                                <>
                                  <button onClick={() => viewFile(c.arquivo_url)} title="Visualizar" className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"><Eye size={13} /></button>
                                  <button onClick={() => downloadFile(c.arquivo_url, `${c.tipo_certidao}.pdf`)} title="Baixar" className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"><Download size={13} /></button>
                                </>
                              ) : (
                                <button onClick={() => handleFileUpload(c.id)} disabled={uploading === c.id} title="Anexar PDF" className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"><Upload size={13} /></button>
                              )}
                              <button onClick={() => removeCertidao(c.id)} title="Excluir" className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-border/10 rounded-2xl opacity-30 flex flex-col items-center gap-2">
                       <FileText size={24} className="text-muted-foreground" />
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma certidão</p>
                    </div>
                  )}

                  <div className="bg-black/10 dark:bg-white/5 border border-border/10 rounded-2xl p-4 md:p-5 space-y-4 shadow-inner">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/5 pb-3">
                       <div className="flex items-center gap-2">
                         <Plus size={14} className="text-primary" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Nova Certidão</span>
                       </div>
                       
                       {newCert.tipo_certidao === "CND Federal" && (
                         <div className="flex items-center gap-2 p-1 bg-card rounded-lg border border-border/10">
                           <select 
                             value={cndTipoPessoa} 
                             onChange={e => setCndTipoPessoa(e.target.value as "PJ" | "PF")} 
                             className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none px-2 border-r border-border/10 cursor-pointer h-7"
                           >
                             <option value="PJ">PJ</option>
                             <option value="PF">PF</option>
                           </select>
                           <button 
                             onClick={() => handleConsultaCND(emp.id, emp.cnpj)}
                             disabled={consulting === emp.id}
                             className="px-4 h-7 bg-primary text-primary-foreground rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
                           >
                             {consulting === emp.id ? "AGUARDE..." : "CONSULTAR SERPRO"}
                           </button>
                         </div>
                       )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={() => addCertidao(emp.id)} 
                        className="h-10 px-8 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Plus size={16} /> SALVAR CERTIDÃO
                      </button>
                    </div>
                  </div>
                  </TabsContent>

                  <TabsContent value="pastas" className="animate-in slide-in-from-right-2 duration-300 outline-none">
                     <ModuleFolderView empresa={emp} departamentoId="certidoes" />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
};

export default CertidoesPage;
