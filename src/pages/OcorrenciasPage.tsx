import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileText, Download, Building2, User, Search, Plus, Trash2, Calendar, History as HistoryIcon, Settings2, Upload, LayoutGrid, List, Image as ImageIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";

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
    logoUrl: "", // Use asset by default if empty
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

interface Empresa {
    id: string;
    nome_empresa: string;
    cnpj: string | null;
    socios?: any[];
}

interface Ocorrencia {
    id: string;
    empresa_id: string;
    departamento: string;
    descricao: string;
    cidade: string;
    estado: string;
    data_ocorrencia: string;
    created_at: string;
    empresas: {
        nome_empresa: string;
        cnpj: string | null;
    };
}

const DEPARTAMENTOS = [
    "Societário",
    "Fiscal",
    "Pessoal",
    "Contábil",
    "Financeiro",
    "Administrativo"
];

const OcorrenciasPage: React.FC = () => {
    const { userData } = useAuth();
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"geral" | "config">("geral");
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);
    const [savingConfig, setSavingConfig] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Form state
    const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
    const [selectedDepto, setSelectedDepto] = useState("");
    const [descricao, setDescricao] = useState("");
    const [cidade, setCidade] = useState("Fazenda Rio Grande");
    const [estado, setEstado] = useState("PR");
    const [dataOcorrencia, setDataOcorrencia] = useState(new Date().toISOString().split('T')[0]);

    const fetchInitialData = async () => {
        try {
            const { data: empData } = await supabase.from("empresas").select("id, nome_empresa, cnpj").order("nome_empresa");
            const { data: ocData } = await (supabase.from("ocorrencias") as any).select("*, empresas(nome_empresa, cnpj)").order("created_at", { ascending: false });
            const { data: configData } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();

            if (empData) setEmpresas(empData);
            if (ocData) setOcorrencias(ocData as any);
            if (configData?.value) {
                try {
                    setHeaderConfig(JSON.parse(configData.value));
                } catch (e) {
                    console.error("Erro ao parsear config:", e);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleSave = async (generatePdf = false) => {
        if (!selectedEmpresaId || !selectedDepto || !descricao) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await (supabase.from("ocorrencias") as any).insert([
                {
                    empresa_id: selectedEmpresaId,
                    departamento: selectedDepto,
                    descricao,
                    cidade,
                    estado,
                    data_ocorrencia: dataOcorrencia,
                    usuario_id: userData?.userId
                }
            ]).select("*, empresas(nome_empresa, cnpj)").single();

            if (error) throw error;

            toast.success("Ocorrência registrada com sucesso!");
            setOcorrencias([data as any, ...ocorrencias]);

            if (generatePdf) {
                handleGeneratePdf(data as any);
            }

            // Reset form
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

        // Fetch Socio Administrador
        const { data: manager } = await supabase
            .from("socios")
            .select("nome, cpf")
            .eq("empresa_id", oc.empresa_id)
            .eq("administrador", true)
            .maybeSingle();

        // Fetch User Profile to get latest Name/CPF (avoiding stale context)
        const { data: profile } = await supabase
            .from("profiles")
            .select("nome_completo, cpf")
            .eq("user_id", userData?.userId)
            .maybeSingle();

        const usuarioNome = profile?.nome_completo || userData?.nome || "";
        const usuarioCPF = profile?.cpf || userData?.cpf || "";

        // Header - Logo and Text
        try {
            const logoToUse = headerConfig.logoUrl || logoCaduceu;

            // Safe image loading via DOM Image
            const imgData = await new Promise<HTMLImageElement | string>((resolve, reject) => {
                if (logoToUse.startsWith('data:')) {
                    resolve(logoToUse);
                } else {
                    const img = new Image();
                    if (logoToUse.startsWith('http')) {
                        img.crossOrigin = 'Anonymous';
                    }
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Image failed to load (CORS or Invalid URL)"));
                    img.src = logoToUse;
                }
            });

            let format = 'PNG';
            if (typeof imgData === 'string') {
                if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) format = 'JPEG';
                else if (imgData.startsWith('data:image/webp')) format = 'WEBP';
            }

            doc.addImage(imgData, format, headerConfig.logoX, headerConfig.logoY, headerConfig.logoWidth, headerConfig.logoHeight);
        } catch (e) {
            console.warn("Logo blocked by CORS or invalid. Generating PDF without custom logo.", e);
            if (headerConfig.logoUrl && headerConfig.logoUrl.startsWith('http')) {
                toast.error("O link da logo foi bloqueado por segurança (CORS). Por favor, baixe a imagem para o seu computador e faça o upload dela nas configurações.");
            }
            // Fallback to default if custom url failed
            try {
                if (headerConfig.logoUrl) {
                    doc.addImage(logoCaduceu, 'PNG', headerConfig.logoX, headerConfig.logoY, headerConfig.logoWidth, headerConfig.logoHeight);
                }
            } catch (fallbackError) {
                console.warn("Fallback logo failed", fallbackError);
            }
        }

        doc.setFont("Ubuntu", "bold");
        doc.setFontSize(headerConfig.titleFontSize);
        doc.text(headerConfig.title, pageWidth / 2 + 10, 20, { align: "center" });

        doc.setFontSize(headerConfig.subtitleFontSize);
        doc.setFont("Ubuntu", "normal");
        doc.text(headerConfig.subtitle, pageWidth / 2 + 10, 26, { align: "center" });

        doc.setFontSize(headerConfig.infoFontSize);
        doc.text(headerConfig.address, pageWidth / 2, 34, { align: "center" });
        doc.text(headerConfig.contact, pageWidth / 2, 38, { align: "center" });

        // Separator line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, 42, pageWidth - 10, 42);

        // Title
        doc.setFontSize(14);
        doc.setFont("Ubuntu", "bold");
        doc.text("OCORRÊNCIA", pageWidth / 2, 55, { align: "center" });

        // Company Info
        doc.setFontSize(11);
        doc.text(`Empresa: ${oc.empresas.nome_empresa}`, 20, 70);
        doc.text(`CNPJ: ${oc.empresas.cnpj || "—"}`, 20, 76);

        // Occurrence text
        doc.setFont("Ubuntu", "normal"); // Utilizing custom Ubuntu font
        const splitDesc = doc.splitTextToSize(oc.descricao, pageWidth - 40);
        doc.text(splitDesc, 20, 90);

        const descHeight = splitDesc.length * 7;
        const lineY = 90 + descHeight + 10;


        // Date/Place
        const formattedDate = new Date(oc.data_ocorrencia).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
        doc.text(`${oc.cidade}/${oc.estado}, ${formattedDate}`, pageWidth - 20, lineY + 20, { align: "right" });

        // Signatures
        const sigY = lineY + 60;

        // Left side: Company/Admin
        doc.line(20, sigY, 100, sigY);
        doc.setFont("Ubuntu", "bold");
        doc.setFontSize(9);
        doc.text(oc.empresas.nome_empresa, 20, sigY + 5);
        doc.text(`CNPJ: ${oc.empresas.cnpj || ""}`, 20, sigY + 10);

        doc.text("Socio(a) Administrador(a)", 20, sigY + 18);
        doc.setFont("Ubuntu", "normal");
        doc.text(manager?.nome || "____________________________", 20, sigY + 23);
        const managerCPF = manager?.cpf ? `CPF: ${manager.cpf}` : "CPF: ________________________";
        doc.text(managerCPF, 20, sigY + 28);

        // Right side: User/Dept
        doc.line(pageWidth - 100, sigY, pageWidth - 20, sigY);
        doc.setFont("Ubuntu", "bold");
        doc.text(usuarioNome.toUpperCase(), pageWidth - 100, sigY + 5);
        doc.text(`CPF: ${usuarioCPF}`, pageWidth - 100, sigY + 10);
        doc.text(`Departamento: ${oc.departamento}`, pageWidth - 100, sigY + 15);

        doc.save(`Ocorrencia_${oc.empresas.nome_empresa.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Tem certeza que deseja excluir esta ocorrência?")) return;
        try {
            const { error } = await (supabase.from("ocorrencias") as any).delete().eq("id", id);
            if (error) throw error;
            setOcorrencias(ocorrencias.filter(o => o.id !== id));
            toast.success("Ocorrência excluída");
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setOcorrencias(ocorrencias.map(o => o.id === id ? { ...o, status: newStatus } : o));
            
            const { error } = await (supabase.from("ocorrencias") as any).update({ status: newStatus }).eq("id", id);
            if (error) throw error;
        } catch (error: any) {
            toast.error("Erro ao atualizar status do card: " + error.message);
            // Revert state
            fetchInitialData();
        }
    };

    const saveHeaderConfig = async () => {
        setSavingConfig(true);
        try {
            const { error } = await supabase.from("app_config").upsert({
                key: "pdf_header_config",
                value: JSON.stringify(headerConfig)
            }, { onConflict: "key" });

            if (error) throw error;
            toast.success("Configuração de cabeçalho salva!");
        } catch (error: any) {
            toast.error("Erro ao salvar config: " + error.message);
        } finally {
            setSavingConfig(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("A logo deve ter no máximo 2MB");
            return;
        }

        setUploadingLogo(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setHeaderConfig({ ...headerConfig, logoUrl: reader.result as string });
            setUploadingLogo(false);
            toast.success("Logo carregada localmente! Salve as configurações.");
        };
        reader.onerror = () => {
            setUploadingLogo(false);
            toast.error("Erro ao carregar a imagem selecionada.");
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Ocorrências</h1>
                    <p className="text-muted-foreground">Gerenciamento e geração de documentos de ocorrência</p>
                </div>
                <div className="flex gap-2 bg-muted p-1 rounded-lg self-start">
                    <button
                        onClick={() => setActiveTab("geral")}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === "geral" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Geral
                    </button>
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === "config" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <Settings2 size={16} /> Configurações
                    </button>
                </div>
            </div>

            {activeTab === "config" ? (
                <div className="module-card max-w-4xl mx-auto space-y-6">
                    <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                        <Settings2 size={24} /> Personalização do Cabeçalho PDF
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase">Conteúdo</h3>
                            <div>
                                <label className="text-xs font-bold mb-1 block">Título Principal</label>
                                <input
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                    value={headerConfig.title}
                                    onChange={e => setHeaderConfig({ ...headerConfig, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold mb-1 block">Subtítulo (CRC, etc)</label>
                                <input
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                    value={headerConfig.subtitle}
                                    onChange={e => setHeaderConfig({ ...headerConfig, subtitle: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold mb-1 block">Endereço (Linha 1)</label>
                                <input
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                    value={headerConfig.address}
                                    onChange={e => setHeaderConfig({ ...headerConfig, address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold mb-1 block">Contato/Email (Linha 2)</label>
                                <input
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                    value={headerConfig.contact}
                                    onChange={e => setHeaderConfig({ ...headerConfig, contact: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold mb-1 block">Logo do Cabeçalho</label>
                                <div className="flex items-center gap-4 p-4 border border-dashed border-border rounded-xl bg-muted/20">
                                    <div className="w-20 h-20 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
                                        {headerConfig.logoUrl ? (
                                            <img src={headerConfig.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={30} className="text-muted-foreground/30" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-[10px] text-muted-foreground">Upload da logo em PNG ou JPG. <br />Tamanho recomendado: 200x200px</p>
                                        <div className="flex flex-wrap gap-2">
                                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg cursor-pointer hover:bg-primary/20 transition-all">
                                                <Upload size={14} />
                                                {uploadingLogo ? "Carregando..." : "Selecionar Logo"}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                            </label>

                                            {headerConfig.logoUrl && (
                                                <button
                                                    onClick={() => setHeaderConfig({ ...headerConfig, logoUrl: "" })}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-bold rounded-lg cursor-pointer hover:bg-destructive/20 transition-all"
                                                    title="Remover Logo Customizada"
                                                >
                                                    <Trash2 size={14} />
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase">Tamanhos e Posições</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Fonte Título</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.titleFontSize} onChange={e => setHeaderConfig({ ...headerConfig, titleFontSize: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Fonte Subtítulo</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.subtitleFontSize} onChange={e => setHeaderConfig({ ...headerConfig, subtitleFontSize: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Fonte Info</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.infoFontSize} onChange={e => setHeaderConfig({ ...headerConfig, infoFontSize: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Largura Logo</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.logoWidth} onChange={e => setHeaderConfig({ ...headerConfig, logoWidth: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Altura Logo</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.logoHeight} onChange={e => setHeaderConfig({ ...headerConfig, logoHeight: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Posição Logo X</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.logoX} onChange={e => setHeaderConfig({ ...headerConfig, logoX: parseInt(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold mb-1 block">Posição Logo Y</label>
                                    <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" value={headerConfig.logoY} onChange={e => setHeaderConfig({ ...headerConfig, logoY: parseInt(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-border flex justify-end">
                        <button
                            onClick={saveHeaderConfig}
                            disabled={savingConfig}
                            className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                        >
                            {savingConfig ? "Salvando..." : "Salvar Configurações"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="module-card">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
                                <Plus size={20} /> Nova Ocorrência
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Empresa</label>
                                    <select
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={selectedEmpresaId}
                                        onChange={(e) => setSelectedEmpresaId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Departamento</label>
                                    <select
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={selectedDepto}
                                        onChange={(e) => setSelectedDepto(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Data</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary"
                                        value={dataOcorrencia}
                                        onChange={(e) => setDataOcorrencia(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Ocorrência/Descrição</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                                        placeholder="Descreva a ocorrência..."
                                        value={descricao}
                                        onChange={(e) => setDescricao(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Cidade</label>
                                        <input
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                            value={cidade}
                                            onChange={(e) => setCidade(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-tight">Estado</label>
                                        <input
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                                            value={estado}
                                            onChange={(e) => setEstado(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <button
                                        onClick={() => handleSave(false)}
                                        disabled={saving}
                                        className="w-full py-2.5 bg-muted text-foreground rounded-lg font-bold text-sm hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? "Salvando..." : "Apenas Salvar"}
                                    </button>
                                    <button
                                        onClick={() => handleSave(true)}
                                        disabled={saving}
                                        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? "Salvando..." : <><Download size={18} /> Salvar e Gerar PDF</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List of Recent Occurrences */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                               <HistoryIcon size={20} className="text-primary" /> Board de Ocorrências
                           </h3>
                        </div>

                        <div className="module-card">
                            <div className="space-y-3">
                                {ocorrencias.length === 0 && !loading && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText size={40} className="mx-auto mb-3 opacity-20" />
                                        <p>Nenhuma ocorrência registrada</p>
                                    </div>
                                )}

                                {ocorrencias.map(oc => (
                                    <div key={oc.id} className="p-4 border border-border rounded-xl hover:bg-muted/30 transition-all flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-card-foreground">{oc.empresas.nome_empresa}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1"><User size={12} /> {oc.departamento}</span>
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(oc.data_ocorrencia).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleGeneratePdf(oc)}
                                                className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                title="Gerar PDF"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(oc.id)}
                                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OcorrenciasPage;
