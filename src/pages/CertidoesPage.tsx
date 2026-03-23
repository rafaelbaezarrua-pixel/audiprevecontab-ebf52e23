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
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm w-full">
        <FavoriteToggleButton moduleId="certidoes" />
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Certidões Federais, Estaduais e Municipais</h2>
          <p className="text-xs text-muted-foreground">Gestão de emissão e controle de CNDs e afins.</p>
        </div>
      </div>
      <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" />
      <div className="relative max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="text" placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none" /></div>
      <div className="space-y-3">
        {filtered.map(emp => {
          const isOpen = expanded === emp.id;
          const empCerts = certidoes.filter(c => c.empresa_id === emp.id);
          const vencidas = empCerts.filter(c => calcDias(c.vencimento) < 0).length;
          return (
            <div key={emp.id} className="module-card !p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(isOpen ? null : emp.id)}>
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div><div><p className="font-medium text-card-foreground">{emp.nome_empresa}</p><p className="text-xs text-muted-foreground">{emp.cnpj || "—"}</p></div></div>
                <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{empCerts.length} certidões</span>{vencidas > 0 && <span className="badge-status badge-danger">{vencidas} vencidas</span>}{isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}</div>
              </div>
              {isOpen && (
                <div className="border-t border-border p-5 space-y-4 bg-muted/10">
                  {empCerts.length > 0 && (
                    <div className="space-y-2">
                      {empCerts.map((c: CertidaoRecord) => {
                        const dias = calcDias(c.vencimento);
                        const statusCls = dias < 0 ? "badge-danger" : dias <= 30 ? "badge-warning" : "badge-success";
                        const statusLabel = dias === 999 ? "—" : dias < 0 ? "Vencida" : dias <= 30 ? "Próxima" : "Válida";
                        const hasFile = !!c.arquivo_url;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-primary" />
                              <div>
                                <p className="text-sm font-medium text-card-foreground">{c.tipo_certidao}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.vencimento ? `Venc: ${formatDateBR(c.vencimento)}` : "Sem vencimento"}
                                  {dias !== 999 && ` (${dias}d)`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`badge-status ${statusCls}`}>{statusLabel}</span>
                              {hasFile ? (
                                <>
                                  <button onClick={() => viewFile(c.arquivo_url)} title="Visualizar" className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Eye size={14} /></button>
                                  <button onClick={() => downloadFile(c.arquivo_url, `${c.tipo_certidao}.pdf`)} title="Baixar" className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Download size={14} /></button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleFileUpload(c.id)}
                                  disabled={uploading === c.id}
                                  title="Anexar PDF"
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                                >
                                  <Upload size={14} />
                                </button>
                              )}
                              {hasFile && (
                                <button
                                  onClick={() => handleFileUpload(c.id)}
                                  disabled={uploading === c.id}
                                  title="Substituir arquivo"
                                  className="p-1.5 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors disabled:opacity-50"
                                >
                                  <Upload size={14} />
                                </button>
                              )}
                              <button onClick={() => removeCertidao(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                    <p className="text-sm font-medium text-card-foreground">Adicionar Certidão</p>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className={labelCls}>Tipo</label>
                        <select value={newCert.tipo_certidao} onChange={e => setNewCert({ ...newCert, tipo_certidao: e.target.value })} className={inputCls}>{tiposCertidao.map(t => <option key={t} value={t}>{t}</option>)}</select>
                      </div>
                      {newCert.tipo_certidao === "CND Federal" && (
                        <div>
                          <label className={labelCls}>Consultar como</label>
                          <div className="flex gap-2">
                            <select 
                              value={cndTipoPessoa} 
                              onChange={e => setCndTipoPessoa(e.target.value as "PJ" | "PF")} 
                              className={inputCls}
                            >
                              <option value="PJ">Empresa (PJ)</option>
                              <option value="PF">Sócio Titular (PF)</option>
                            </select>
                            <button 
                              onClick={() => handleConsultaCND(emp.id, emp.cnpj)}
                              disabled={consulting === emp.id}
                              className="px-3 py-2 bg-info/10 text-info rounded-lg text-xs font-semibold hover:bg-info/20 whitespace-nowrap transition-all flex items-center gap-2"
                            >
                              {consulting === emp.id ? "Consultando..." : <><Search size={14} /> Consultar CND</>}
                            </button>
                          </div>
                        </div>
                      )}
                      <div><label className={labelCls}>Data de Validade</label><input type="date" value={newCert.vencimento} onChange={e => setNewCert({ ...newCert, vencimento: e.target.value })} className={inputCls} /></div>
                      <div><label className={labelCls}>Observação</label><input value={newCert.observacao} onChange={e => setNewCert({ ...newCert, observacao: e.target.value })} className={inputCls} /></div>
                      <div>
                        <label className={labelCls}>Arquivo PDF</label>
                        <input type="file" ref={newFileInputRef} accept=".pdf" onChange={e => setNewFile(e.target.files?.[0] || null)} className="w-full text-sm text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
                      </div>
                      <div className="flex items-end"><button onClick={() => addCertidao(emp.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}><Plus size={14} /> Adicionar</button></div>
                    </div>
                  </div>
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
