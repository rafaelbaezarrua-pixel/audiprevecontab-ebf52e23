import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Download, Building2, User, Search, Plus, Trash2, Calendar, History as HistoryIcon, Settings2, Upload, LayoutGrid, List, Image as ImageIcon, Save } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import { useOcorrencias, Ocorrencia } from "@/hooks/useOcorrencias";
import { useQuery } from "@tanstack/react-query";

interface HeaderConfig {
    logoUrl: string;
    title: string;
    subtitle: string;
    address: string;
    contact: string;
    titleFontSize: number;
    subtitleFontSize: number;
    infoFontSize: number;
    logoWidth: number;
    logoHeight: number;
    logoX: number;
    logoY: number;
}

const DEFAULT_HEADER: HeaderConfig = {
    logoUrl: "", 
    title: "Audipreve Contabilidade",
    subtitle: "CRC-PR nº. 01.0093/O - 6",
    address: "Rua Jequitibá, n.º 789, 1º andar, sala 01, Bairro Nações, CEP 83823-004,",
    contact: "Fazenda Rio Grande/PR. Fone: (41) 3604-8059 | E-mail: societario@audiprevecontabilidade.com.br",
    titleFontSize: 22,
    subtitleFontSize: 10,
    infoFontSize: 8,
    logoWidth: 20,
    logoHeight: 20,
    logoX: 20,
    logoY: 10
};

const DEPARTAMENTOS = ["Societário", "Fiscal", "Pessoal", "Contábil", "Financeiro", "Administrativo"];

const OcorrenciasPage: React.FC = () => {
    const { userData } = useAuth();
    const { ocorrencias, isLoading, isFetching, createOcorrencia, deleteOcorrencia } = useOcorrencias();
    
    // Fetch companies for select
    const { data: empresas = [] } = useQuery({
        queryKey: ["empresas_minimal"],
        queryFn: async () => {
             const { data } = await supabase.from("empresas").select("id, nome_empresa, cnpj").order("nome_empresa");
             return data || [];
        },
        staleTime: 60000 * 10
    });

    // Fetch users for select
    const { data: usuarios = [] } = useQuery({
        queryKey: ["usuarios_profiles"],
        queryFn: async () => {
             const { data, error } = await supabase.from("profiles").select("user_id, nome_completo").not("nome_completo", "is", null).order("nome_completo");
             if (error) throw error;
             return data || [];
        },
        staleTime: 60000 * 30
    });

    // Header Config
    const { data: headerConfigData } = useQuery({
        queryKey: ["app_config_header"],
        queryFn: async () => {
             const { data } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();
             if (data?.value) return JSON.parse(data.value) as HeaderConfig;
             return DEFAULT_HEADER;
        },
        staleTime: 60000 * 30
    });

    const headerConfig = headerConfigData || DEFAULT_HEADER;

    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"geral" | "config">("geral");
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [localHeaderConfig, setLocalHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);

    useEffect(() => {
        if (headerConfigData) setLocalHeaderConfig(headerConfigData);
    }, [headerConfigData]);

    const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
    const [selectedDepto, setSelectedDepto] = useState("");
    const [selectedUsuarioId, setSelectedUsuarioId] = useState("");
    const [descricao, setDescricao] = useState("");
    const [cidade, setCidade] = useState("Fazenda Rio Grande");
    const [estado, setEstado] = useState("PR");
    const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (userData?.userId && !selectedUsuarioId) {
            setSelectedUsuarioId(userData.userId);
        }
    }, [userData, selectedUsuarioId]);

    const handleSave = async (generatePdf = false) => {
        if (!selectedEmpresaId || !selectedDepto || !descricao) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setSaving(true);
        try {
            const data = await createOcorrencia.mutateAsync({
                empresa_id: selectedEmpresaId,
                departamento: selectedDepto,
                descricao,
                cidade,
                estado,
                data_ocorrencia: dataOcorrencia,
                usuario_id: selectedUsuarioId || userData?.userId
            });

            toast.success("Ocorrência registrada com sucesso!");

            if (generatePdf) {
                handleGeneratePdf(data as any);
            }

            setSelectedEmpresaId("");
            setSelectedDepto("");
            setDescricao("");
        } catch (error: any) {
            toast.error("Erro ao salvar ocorrência: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleGeneratePdf = async (oc: Ocorrencia) => {
        const doc = new jsPDF();
        doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
        doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
        doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
        doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");
        const pageWidth = doc.internal.pageSize.getWidth();

        // Socio info
        const { data: manager } = await supabase.from("socios").select("nome, cpf").eq("empresa_id", oc.empresa_id).eq("administrador", true).maybeSingle();
        
        // Use the user assigned to the occurrence, not necessarily the current user
        const targetUserId = oc.usuario_id || userData?.userId;
        const { data: profile } = await supabase.from("profiles").select("nome_completo, cpf").eq("user_id", targetUserId).maybeSingle();
        
        const usuarioNome = profile?.nome_completo || "Audipreve Contabilidade";
        const usuarioCPF = profile?.cpf || "";

        try {
            const logoToUse = localHeaderConfig.logoUrl || logoCaduceu;
            const imgData = await new Promise<HTMLImageElement | string>((resolve, reject) => {
                if (logoToUse.startsWith('data:')) resolve(logoToUse);
                else {
                    const img = new Image();
                    if (logoToUse.startsWith('http')) img.crossOrigin = 'Anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Image failed to load"));
                    img.src = logoToUse;
                }
            });
            let format = 'PNG';
            if (typeof imgData === 'string') {
                if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) format = 'JPEG';
                else if (imgData.startsWith('data:image/webp')) format = 'WEBP';
            }
            doc.addImage(imgData, format, localHeaderConfig.logoX, localHeaderConfig.logoY, localHeaderConfig.logoWidth, localHeaderConfig.logoHeight);
        } catch (e) {
            try { doc.addImage(logoCaduceu, 'PNG', localHeaderConfig.logoX, localHeaderConfig.logoY, localHeaderConfig.logoWidth, localHeaderConfig.logoHeight); } catch (f) {}
        }

        doc.setFont("Ubuntu", "bold").setFontSize(localHeaderConfig.titleFontSize);
        doc.text(localHeaderConfig.title, pageWidth / 2 + 10, 20, { align: "center" });
        doc.setFontSize(localHeaderConfig.subtitleFontSize).setFont("Ubuntu", "normal");
        doc.text(localHeaderConfig.subtitle, pageWidth / 2 + 10, 26, { align: "center" });
        doc.setFontSize(localHeaderConfig.infoFontSize);
        doc.text(localHeaderConfig.address, pageWidth / 2, 34, { align: "center" });
        doc.text(localHeaderConfig.contact, pageWidth / 2, 38, { align: "center" });
        doc.setDrawColor(0).setLineWidth(0.5).line(10, 42, pageWidth - 10, 42);

        doc.setFontSize(14).setFont("Ubuntu", "bold").text("OCORRÊNCIA", pageWidth / 2, 55, { align: "center" });
        doc.setFontSize(11).text(`Empresa: ${oc.empresas.nome_empresa}`, 20, 70);
        doc.text(`CNPJ: ${oc.empresas.cnpj || "—"}`, 20, 76);
        doc.setFont("Ubuntu", "normal");
        const splitDesc = doc.splitTextToSize(oc.descricao, pageWidth - 40);
        doc.text(splitDesc, 20, 90);
        const descHeight = splitDesc.length * 7;
        const lineY = 90 + descHeight + 10;
        const formattedDate = new Date(oc.data_ocorrencia).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(`${oc.cidade}/${oc.estado}, ${formattedDate}`, pageWidth - 20, lineY + 20, { align: "right" });

        const sigY = lineY + 60;
        doc.line(20, sigY, 100, sigY);
        doc.setFont("Ubuntu", "bold").setFontSize(9);
        doc.text(oc.empresas.nome_empresa, 20, sigY + 5);
        doc.text(`CNPJ: ${oc.empresas.cnpj || ""}`, 20, sigY + 10);
        doc.text("Socio(a) Administrador(a)", 20, sigY + 18);
        doc.setFont("Ubuntu", "normal").text(manager?.nome || "____________________________", 20, sigY + 23);
        doc.text(manager?.cpf ? `CPF: ${manager.cpf}` : "CPF: ________________________", 20, sigY + 28);

        doc.line(pageWidth - 100, sigY, pageWidth - 20, sigY);
        doc.setFont("Ubuntu", "bold").text(usuarioNome.toUpperCase(), pageWidth - 100, sigY + 5);
        doc.text(`CPF: ${usuarioCPF}`, pageWidth - 100, sigY + 10);
        doc.text(`Departamento: ${oc.departamento}`, pageWidth - 100, sigY + 15);
        doc.save(`Ocorrencia_${oc.empresas.nome_empresa.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir?")) return;
        try {
            await deleteOcorrencia.mutateAsync(id);
            toast.success("Excluída");
        } catch (error) { toast.error("Erro ao excluir"); }
    };

    const saveHeaderConfig = async () => {
        setSavingConfig(true);
        try {
            const { error } = await supabase.from("app_config").upsert({
                key: "pdf_header_config",
                value: JSON.stringify(localHeaderConfig)
            }, { onConflict: "key" });
            if (error) throw error;
            toast.success("Configuração salva!");
        } catch (error: any) { toast.error("Erro: " + error.message); }
        finally { setSavingConfig(false); }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Máximo 2MB"); return; }
        setUploadingLogo(true);
        const reader = new FileReader();
        reader.onloadend = () => { setLocalHeaderConfig({ ...localHeaderConfig, logoUrl: reader.result as string }); setUploadingLogo(false); };
        reader.readAsDataURL(file);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando ocorrências...</p>
            </div>
        );
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
             <h1 className="header-title">Ocorrências <span className="text-primary/90">Oficiais</span></h1>
             <FavoriteToggleButton moduleId="ocorrencias" />
          </div>
          <p className="subtitle-premium">Gerenciamento ágil e seguro de ocorrências para documentação oficial e registros internos.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isFetching && (
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Sincronizando...</span>
            </div>
          )}
          
          <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar shadow-sm">
            <button
              onClick={() => setActiveTab("geral")}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "geral" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
              Board Geral
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "config" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
              <Settings2 size={16} /> Header PDF
            </button>
          </div>
        </div>
      </div>

      {activeTab === "config" ? (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-primary/20 rounded-[2.5rem] p-10 shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-4 mb-10 border-b border-border/40 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                         <Settings2 size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Personalização do Cabeçalho</h2>
                        <p className="text-xs text-muted-foreground font-medium">Configure os dados exibidos nos documentos PDF gerados.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <LayoutGrid size={14} className="text-primary" /> CONTEÚDO TEXTUAL
                        </h3>
                        {[
                            { k: 'title', l: 'Título da Empresa' }, { k: 'subtitle', l: 'Subtítulo (CRC/Registro)' }, { k: 'address', l: 'Endereço Completo' }, { k: 'contact', l: 'Informações de Contato' }
                        ].map(x => (
                            <div key={x.k} className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{x.l}</label>
                                <input 
                                    className="w-full h-12 px-4 bg-muted/20 border border-border/40 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                                    value={(localHeaderConfig as any)[x.k]} 
                                    onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [x.k]: e.target.value })} 
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                 <ImageIcon size={14} className="text-primary" /> LOGOTIPO / SELO
                            </h3>
                            <div className="flex items-center gap-6 p-6 border-2 border-dashed border-border/40 rounded-3xl bg-muted/10 group hover:border-primary/30 transition-all">
                                <div className="w-24 h-24 rounded-2xl bg-card border border-border/60 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                                    {localHeaderConfig.logoUrl ? <img src={localHeaderConfig.logoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon size={32} className="text-muted-foreground/20" />}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <label className="h-11 flex items-center justify-center gap-2 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                                            <Upload size={16} /> {uploadingLogo ? "ENVIANDO..." : "ESCOLHER LOGO"} 
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        </label>
                                        {localHeaderConfig.logoUrl && (
                                            <button 
                                                onClick={() => setLocalHeaderConfig({ ...localHeaderConfig, logoUrl: "" })} 
                                                className="h-11 flex items-center justify-center gap-2 px-4 bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-destructive/20 transition-all"
                                            >
                                                <Trash2 size={16} /> REMOVER
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                 <Settings2 size={14} className="text-primary" /> AJUSTES DE POSIÇÃO E FONTE
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {['titleFontSize', 'subtitleFontSize', 'infoFontSize', 'logoWidth', 'logoHeight', 'logoX', 'logoY'].map(k => (
                                    <div key={k} className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                            {k.replace('FontSize', ' (Px)').replace('logo', 'Logo ').replace('Width', 'L').replace('Height', 'H').replace('title', 'Título').replace('subtitle', 'Subt').replace('info', 'Info')}
                                        </label>
                                        <input 
                                            type="number" 
                                            className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary text-primary font-ubuntu" 
                                            value={(localHeaderConfig as any)[k]} 
                                            onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [k]: parseInt(e.target.value) })} 
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-10 mt-10 border-t border-border/40 flex justify-end">
                    <button 
                        onClick={saveHeaderConfig} 
                        disabled={savingConfig} 
                        className="h-14 px-12 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                    >
                        {savingConfig ? "SALVANDO..." : <><Save size={18} /> SALVAR CONFIGURAÇÕES</>}
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form Column */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-card border border-border/60 rounded-[2rem] p-8 shadow-xl shadow-black/5 h-fit sticky top-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                            <Plus size={20} />
                        </div>
                        <h3 className="text-lg font-black text-card-foreground uppercase tracking-tight">Nova Ocorrência</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresa</label>
                            <select 
                                className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" 
                                value={selectedEmpresaId} 
                                onChange={(e) => setSelectedEmpresaId(e.target.value)}
                            >
                                <option value="">SELECIONE UMA EMPRESA...</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Departamento</label>
                            <select 
                                className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" 
                                value={selectedDepto} 
                                onChange={(e) => setSelectedDepto(e.target.value)}
                            >
                                <option value="">SELECIONE O SETOR...</option>
                                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsável</label>
                            <select 
                                className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer" 
                                value={selectedUsuarioId} 
                                onChange={(e) => setSelectedUsuarioId(e.target.value)}
                            >
                                <option value="">SELECIONE O USUÁRIO...</option>
                                {usuarios.map(u => <option key={u.user_id} value={u.user_id}>{u.nome_completo}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data da Ocorrência</label>
                            <input 
                                type="date" 
                                className="w-full h-12 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu" 
                                value={dataOcorrencia} 
                                onChange={(e) => setDataOcorrencia(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descrição</label>
                            <textarea 
                                className="w-full px-4 py-4 bg-muted/30 border border-border/40 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[160px] resize-none leading-relaxed" 
                                placeholder="Descreva os fatos detalhadamente..." 
                                value={descricao} 
                                onChange={(e) => setDescricao(e.target.value)} 
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade</label>
                                <input className="w-full h-11 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold transition-all" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estado</label>
                                <input className="w-full h-11 px-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold transition-all text-center uppercase" maxLength={2} value={estado} onChange={(e) => setEstado(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-4">
                            <button 
                                onClick={() => handleSave(false)} 
                                disabled={saving} 
                                className="h-12 bg-muted text-muted-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 hover:text-foreground transition-all active:scale-95"
                            >
                                {saving ? "PROCESSANDO..." : "APENAS SALVAR"}
                            </button>
                            <button 
                                onClick={() => handleSave(true)} 
                                disabled={saving} 
                                className="h-14 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                            >
                                {saving ? "GERANDO..." : <><Download size={18} /> SALVAR E GERAR PDF</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xl font-black text-card-foreground uppercase tracking-tight flex items-center gap-3">
                        <HistoryIcon size={24} className="text-primary" /> Board de Ocorrências
                    </h3>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/30 px-3 py-1 rounded-full border border-border/60">
                        {ocorrencias.length} REGISTRO(S)
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {ocorrencias.length === 0 ? (
                        <div className="py-24 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
                            <FileText size={48} className="mx-auto mb-4 text-muted-foreground" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma ocorrência registrada no sistema</p>
                        </div>
                    ) : (
                        ocorrencias.map(oc => (
                            <div key={oc.id} className="group bg-card border border-border/60 rounded-3xl p-5 hover:border-primary/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5 flex items-center justify-between gap-6">
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-inner">
                                        <Building2 size={28} />
                                    </div>
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <h4 className="font-black text-sm text-card-foreground uppercase tracking-tight truncate">{oc.empresas.nome_empresa}</h4>
                                        <div className="flex flex-wrap items-center gap-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.1em]">
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/40 text-primary">
                                                <LayoutGrid size={11} /> {oc.departamento}
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                                <Calendar size={11} /> {new Date(oc.data_ocorrencia).toLocaleDateString("pt-BR")}
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                                                <User size={11} /> {oc.usuarios?.nome_completo?.split(' ')[0] || "SISTEMA"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleGeneratePdf(oc)} 
                                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm border border-primary/10"
                                        title="Baixar PDF"
                                    >
                                        <Download size={20} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(oc.id)} 
                                        className="h-12 w-12 flex items-center justify-center rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm border border-destructive/10"
                                        title="Excluir Registro"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
    );
};

export default OcorrenciasPage;
