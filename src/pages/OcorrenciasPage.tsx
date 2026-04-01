import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Download, Building2, User, Search, Plus, Trash2, Calendar, History as HistoryIcon, Settings2, Upload, LayoutGrid, List, Image as ImageIcon } from "lucide-react";
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
    const [descricao, setDescricao] = useState("");
    const [cidade, setCidade] = useState("Fazenda Rio Grande");
    const [estado, setEstado] = useState("PR");
    const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);

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
                usuario_id: userData?.userId
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
        const { data: profile } = await supabase.from("profiles").select("nome_completo, cpf").eq("user_id", userData?.userId).maybeSingle();
        const usuarioNome = profile?.nome_completo || userData?.nome || "";
        const usuarioCPF = profile?.cpf || userData?.cpf || "";

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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-card-foreground">Ocorrências</h1>
                        <FavoriteToggleButton moduleId="ocorrencias" />
                    </div>
                    <p className="text-muted-foreground">Gerenciamento e geração de documentos de ocorrência</p>
                </div>
                <div className="flex items-center gap-3">
                    {isFetching && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-tight">Sincronizando...</span>
                        </div>
                    )}
                    <div className="flex gap-2 bg-muted p-1 rounded-lg">
                        <button onClick={() => setActiveTab("geral")} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === "geral" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Geral</button>
                        <button onClick={() => setActiveTab("config")} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "config" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Settings2 size={16} /> Configurações</button>
                    </div>
                </div>
            </div>

            {activeTab === "config" ? (
                <div className="module-card max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <h2 className="text-xl font-bold text-primary flex items-center gap-2"> <Settings2 size={24} /> Personalização do Cabeçalho </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase">Conteúdo</h3>
                            {[
                                { k: 'title', l: 'Título' }, { k: 'subtitle', l: 'Subtítulo' }, { k: 'address', l: 'Endereço' }, { k: 'contact', l: 'Contato' }
                            ].map(x => (
                                <div key={x.k}>
                                    <label className="text-xs font-bold mb-1 block">{x.l}</label>
                                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={(localHeaderConfig as any)[x.k]} onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [x.k]: e.target.value })} />
                                </div>
                            ))}
                            <div>
                                <label className="text-xs font-bold mb-1 block">Logo</label>
                                <div className="flex items-center gap-4 p-4 border border-dashed border-border rounded-xl bg-muted/20">
                                    <div className="w-20 h-20 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                                        {localHeaderConfig.logoUrl ? <img src={localHeaderConfig.logoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon size={30} className="text-muted-foreground/30" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg cursor-pointer hover:bg-primary/20"><Upload size={14} /> {uploadingLogo ? "..." : "Selo"} <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} /></label>
                                            {localHeaderConfig.logoUrl && <button onClick={() => setLocalHeaderConfig({ ...localHeaderConfig, logoUrl: "" })} className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-bold rounded-lg hover:bg-destructive/20"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase">Tamanhos</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {['titleFontSize', 'subtitleFontSize', 'infoFontSize', 'logoWidth', 'logoHeight', 'logoX', 'logoY'].map(k => (
                                    <div key={k}>
                                        <label className="text-xs font-bold mb-1 block capitalize">{k.replace('FontSize', ' Fonte').replace('logo', 'Logo ')}</label>
                                        <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={(localHeaderConfig as any)[k]} onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [k]: parseInt(e.target.value) })} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-border flex justify-end"><button onClick={saveHeaderConfig} disabled={savingConfig} className="button-premium">{savingConfig ? "..." : "Salvar Configurações"}</button></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                    <div className="lg:col-span-1 border border-border rounded-2xl p-6 bg-card shadow-sm h-fit">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-6"> <Plus size={20} /> Nova Ocorrência </h3>
                        <div className="space-y-5">
                            <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Empresa</label>
                            <select className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary" value={selectedEmpresaId} onChange={(e) => setSelectedEmpresaId(e.target.value)}><option value="">Selecione...</option>{empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Departamento</label>
                            <select className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary" value={selectedDepto} onChange={(e) => setSelectedDepto(e.target.value)}><option value="">Selecione...</option>{DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Data</label><input type="date" className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary" value={dataOcorrencia} onChange={(e) => setDataOcorrencia(e.target.value)} /></div>
                            </div>
                            <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Descrição</label><textarea className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-none" placeholder="..." value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Cidade</label><input className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm" value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
                                <div><label className="text-xs font-bold text-muted-foreground block mb-1 uppercase">Estado</label><input className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm" value={estado} onChange={(e) => setEstado(e.target.value)} /></div>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <button onClick={() => handleSave(false)} disabled={saving} className="w-full py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-all">{saving ? "..." : "Apenas Salvar"}</button>
                                <button onClick={() => handleSave(true)} disabled={saving} className="button-premium w-full flex items-center justify-center gap-2">{saving ? "..." : <><Download size={18} /> Salvar e Gerar PDF</>}</button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2"><h3 className="text-lg font-bold text-card-foreground flex items-center gap-2"><HistoryIcon size={20} className="text-primary" /> Board de Ocorrências</h3></div>
                        <div className="space-y-3">
                            {ocorrencias.length === 0 && <div className="text-center py-20 text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border/50"><FileText size={40} className="mx-auto mb-3 opacity-20" /><p>Nenhuma ocorrência registrada</p></div>}
                            {ocorrencias.map(oc => (
                                <div key={oc.id} className="p-4 border border-border rounded-2xl bg-card hover:shadow-md transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Building2 size={24} /></div>
                                        <div><h4 className="font-bold text-sm text-card-foreground">{oc.empresas.nome_empresa}</h4><div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground font-semibold"><span className="flex items-center gap-1.5"><User size={13} className="text-primary" /> {oc.departamento}</span><span className="flex items-center gap-1.5"><Calendar size={13} className="text-primary" /> {new Date(oc.data_ocorrencia).toLocaleDateString()}</span></div></div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleGeneratePdf(oc)} className="p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"><Download size={20} /></button>
                                        <button onClick={() => handleDelete(oc.id)} className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={20} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OcorrenciasPage;
