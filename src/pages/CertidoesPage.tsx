import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import { Search, Plus, Trash2, ChevronDown, ChevronUp, Building2, FileText, Upload, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";
import { CertidaoRecord } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

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
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Gestão de <span className="text-primary/90">Certidões</span></h1>
             <FavoriteToggleButton moduleId="certidoes" />
          </div>
          <p className="subtitle-premium">Monitoramento e emissão automatizada de CNDs Federais, Estaduais e Municipais.</p>
        </div>
      </div>

      <div className="card-premium !p-6 border-none shadow-xl shadow-primary/5">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            placeholder="Pesquisar por empresa ou CNPJ..." 
            className="w-full h-14 pl-12 pr-4 bg-muted/30 border border-border/40 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:font-normal placeholder:tracking-normal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const empCerts = certidoes.filter(c => c.empresa_id === emp.id);
          const vencidas = empCerts.filter(c => calcDias(c.vencimento) < 0).length;
          
          return (
            <div key={emp.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-lg' : 'border-border/60 hover:border-primary/20'} rounded-3xl transition-all duration-300 overflow-hidden`}>
              <div 
                className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`} 
                onClick={() => setExpanded(isOpen ? null : emp.id)}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    <Building2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-sm uppercase tracking-tight text-card-foreground line-clamp-1">{emp.nome_empresa}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{emp.cnpj || "CNPJ NÃO CADASTRADO"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{empCerts.length} CERTIDÕES</span>
                    {vencidas > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-tighter animate-pulse">
                        {vencidas} VENCIDAS
                      </span>
                    )}
                  </div>
                  <div className={`p-2 rounded-xl bg-muted/50 text-muted-foreground group-hover:text-primary transition-all ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-border/40 p-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                  {empCerts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {empCerts.map((c: CertidaoRecord) => {
                        const dias = calcDias(c.vencimento);
                        const isExpired = dias < 0;
                        const isNear = dias >= 0 && dias <= 30;
                        
                        return (
                          <div key={c.id} className="flex items-center justify-between p-5 rounded-2xl border border-border/60 bg-muted/5 group/item hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpired ? 'bg-destructive/10 text-destructive' : isNear ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                                <FileText size={20} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-tight text-card-foreground">{c.tipo_certidao}</p>
                                <div className="flex items-center gap-2">
                                   <span className={`text-[10px] font-bold ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                                      {c.vencimento ? `Vencimento: ${formatDateBR(c.vencimento)}` : "Sem data de expiração"}
                                   </span>
                                   {dias !== 999 && (
                                     <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${isExpired ? 'bg-destructive text-destructive-foreground' : isNear ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'}`}>
                                       {isExpired ? "Vencida" : `${dias} dias`}
                                     </span>
                                   )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                              {c.arquivo_url ? (
                                <>
                                  <button onClick={() => viewFile(c.arquivo_url)} title="Visualizar" className="p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><Eye size={16} /></button>
                                  <button onClick={() => downloadFile(c.arquivo_url, `${c.tipo_certidao}.pdf`)} title="Baixar" className="p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><Download size={16} /></button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleFileUpload(c.id)}
                                  disabled={uploading === c.id}
                                  title="Anexar PDF"
                                  className="p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                                >
                                  <Upload size={16} />
                                </button>
                              )}
                              {c.arquivo_url && (
                                <button
                                  onClick={() => handleFileUpload(c.id)}
                                  disabled={uploading === c.id}
                                  title="Substituir PDF"
                                  className="p-2.5 rounded-xl hover:bg-warning/10 text-muted-foreground hover:text-warning transition-all disabled:opacity-50"
                                >
                                  <Upload size={16} />
                                </button>
                              )}
                              <button onClick={() => removeCertidao(c.id)} title="Excluir" className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-3xl opacity-40">
                       <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma certidão cadastrada</p>
                    </div>
                  )}

                  <div className="bg-card border border-border/60 rounded-3xl p-8 space-y-8 shadow-inner shadow-muted/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                       <div className="space-y-1">
                         <h3 className="text-sm font-black uppercase tracking-widest text-primary">Nova Certidão</h3>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Preencha os dados ou realize uma consulta automática</p>
                       </div>
                       
                       {newCert.tipo_certidao === "CND Federal" && (
                         <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/60">
                           <select 
                             value={cndTipoPessoa} 
                             onChange={e => setCndTipoPessoa(e.target.value as "PJ" | "PF")} 
                             className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none px-3 border-r border-border/60 cursor-pointer"
                           >
                             <option value="PJ">EMPRESA (PJ)</option>
                             <option value="PF">SÓCIO ADM (PF)</option>
                           </select>
                           <button 
                             onClick={() => handleConsultaCND(emp.id, emp.cnpj)}
                             disabled={consulting === emp.id}
                             className="px-6 h-10 bg-info text-info-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-info/20 disabled:opacity-50"
                           >
                             {consulting === emp.id ? (
                               <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  CONSULTANDO...
                               </div>
                             ) : <><Search size={14} /> CONSULTAR CND</>}
                           </button>
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Certidão</label>
                        <select 
                          value={newCert.tipo_certidao} 
                          onChange={e => setNewCert({ ...newCert, tipo_certidao: e.target.value })} 
                          className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
                        >
                          {tiposCertidao.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Validade</label>
                         <input 
                           type="date" 
                           value={newCert.vencimento} 
                           onChange={e => setNewCert({ ...newCert, vencimento: e.target.value })} 
                           className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" 
                         />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações</label>
                        <input 
                          value={newCert.observacao} 
                          placeholder="Notas internas..."
                          onChange={e => setNewCert({ ...newCert, observacao: e.target.value })} 
                          className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Arquivo PDF</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            ref={newFileInputRef} 
                            accept=".pdf" 
                            onChange={e => setNewFile(e.target.files?.[0] || null)} 
                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                          />
                          <div className={`h-12 flex items-center justify-center border-2 border-dashed rounded-xl px-4 text-[10px] font-black uppercase tracking-widest transition-all ${newFile ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/30 border-border/60 text-muted-foreground hover:border-primary/40'}`}>
                             {newFile ? newFile.name : <><Upload size={14} className="mr-2" /> Selecionar PDF</>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                       <button 
                         onClick={() => addCertidao(emp.id)} 
                         className="px-10 h-14 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                       >
                         <Plus size={18} /> SALVAR CERTIDÃO
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" />
    </div>
  );
};

export default CertidoesPage;
