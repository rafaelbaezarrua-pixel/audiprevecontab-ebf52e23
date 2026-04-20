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
import GerenciadorArquivosPage from "./GerenciadorArquivosPage";
import { formatDateBR } from "@/lib/utils";

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
        queryKey: ["usuarios_profiles_internos"],
        queryFn: async () => {
            // 1. Buscar IDs de usuários que são da equipe interna (admin ou user)
            const { data: rolesData } = await supabase
                .from("user_roles")
                .select("user_id")
                .in("role", ["admin", "user"]);

            const teamUserIds = rolesData?.map(r => r.user_id) || [];

            // 2. Buscar perfis desses usuários
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("user_id, nome_completo")
                .in("user_id", teamUserIds)
                .not("nome_completo", "is", null)
                .order("nome_completo");

            if (error) throw error;
            return (profiles || []).map((p: any) => ({
                user_id: p.user_id,
                nome_completo: p.nome_completo
            }));
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
    const [activeTab, setActiveTab] = useState<"geral" | "config" | "pastas">("geral");
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
            try { doc.addImage(logoCaduceu, 'PNG', localHeaderConfig.logoX, localHeaderConfig.logoY, localHeaderConfig.logoWidth, localHeaderConfig.logoHeight); } catch (f) { }
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
        const formattedDate = formatDateBR(oc.data_ocorrencia);
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
    <div className="animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Layout Wrapper with vertical spacing */}
      <div className="space-y-6">
        {/* Main Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
          <div className="space-y-1 -mt-2">
            <div className="flex items-center gap-2">
              <h1 className="header-title">Gestão de <span className="text-primary/90 font-black">Ocorrências</span></h1>
              <FavoriteToggleButton moduleId="ocorrencias" />
            </div>
            <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Registros e controle interno de ocorrências.</p>
          </div>

          <div className="flex items-center gap-3">
            {isFetching && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/5 border border-primary/10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span className="text-[9px] font-black text-primary">Sinc</span>
              </div>
            )}

            <div className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar shadow-sm">
              {[
                { id: "geral", label: "Ocorrências", icon: null },
                { id: "config", label: "Cabeçalho PDF", icon: <Settings2 size={12} /> },
                { id: "pastas", label: "Pastas", icon: <HistoryIcon size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground/50 hover:text-foreground"}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "config" ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="module-card space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b border-border/10">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest">Cabeçalho do PDF</h2>
                  <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-tight">Personalize os dados oficiais dos documentos.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Conteúdo Textual</h3>
                  {[
                    { k: 'title', l: 'Título Principal' }, { k: 'subtitle', l: 'Subtítulo (CRC)' }, { k: 'address', l: 'Endereço Social' }, { k: 'contact', l: 'Contatos e E-mail' }
                  ].map(x => (
                    <div key={x.k} className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">{x.l}</label>
                      <input
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        value={(localHeaderConfig as any)[x.k]}
                        onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [x.k]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Logotipo</h3>
                    <div className="flex items-center gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-border/10">
                      <div className="w-16 h-16 rounded-xl bg-card border border-border/10 flex items-center justify-center overflow-hidden shadow-sm">
                        {localHeaderConfig.logoUrl ? <img src={localHeaderConfig.logoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon size={20} className="text-muted-foreground/20" />}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                          <label className="h-8 flex items-center justify-center gap-2 px-3 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer hover:bg-primary/90 transition-all shadow-md shadow-primary/10">
                            <Upload size={12} /> {uploadingLogo ? "..." : "UPLOAD"}
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                          </label>
                          {localHeaderConfig.logoUrl && (
                            <button
                              onClick={() => setLocalHeaderConfig({ ...localHeaderConfig, logoUrl: "" })}
                              className="h-8 text-rose-500/60 hover:text-rose-500 text-[9px] font-black uppercase tracking-widest transition-all"
                            >
                              REMOVER LOGO
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                      <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">Dimensões e Fontes (PX)</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {['titleFontSize', 'subtitleFontSize', 'infoFontSize', 'logoWidth', 'logoHeight', 'logoX', 'logoY'].map(k => (
                          <div key={k} className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">
                              {k.replace('FontSize', '').replace('logo', 'Logo ').replace('Width', 'Largura').replace('Height', 'Altura').replace('title', 'Tít.').replace('subtitle', 'Subt.').replace('info', 'Info')}
                            </label>
                            <input
                              type="number"
                              className="w-full h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 text-primary"
                              value={(localHeaderConfig as any)[k]}
                              onChange={e => setLocalHeaderConfig({ ...localHeaderConfig, [k]: parseInt(e.target.value) })}
                            />
                          </div>
                        ))}
                      </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/10 flex justify-end">
                <button
                  onClick={saveHeaderConfig}
                  disabled={savingConfig}
                  className="h-10 px-8 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  {savingConfig ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={14} /> SALVAR ALTERAÇÕES</>}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "pastas" ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="module-card">
              <h2 className="text-[11px] font-black uppercase tracking-widest mb-6">Repositório de Documentos</h2>
              <div className="bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-border/10 p-0.5 overflow-hidden">
                 <GerenciadorArquivosPage />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Form Column */}
            <div className="lg:col-span-4">
              <div className="module-card space-y-4 h-fit sticky top-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Plus size={14} />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Nova Ocorrência</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Empresa</label>
                    <select
                      className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                      value={selectedEmpresaId}
                      onChange={(e) => setSelectedEmpresaId(e.target.value)}
                    >
                      <option value="">SELECIONE...</option>
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_empresa}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Departamento</label>
                      <select
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        value={selectedDepto}
                        onChange={(e) => setSelectedDepto(e.target.value)}
                      >
                        <option value="">ST...</option>
                        {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Data</label>
                      <input
                        type="date"
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                        value={dataOcorrencia}
                        onChange={(e) => setDataOcorrencia(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Responsável</label>
                    <select
                      className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                      value={selectedUsuarioId}
                      onChange={(e) => setSelectedUsuarioId(e.target.value)}
                    >
                      <option value="">RESP...</option>
                      {usuarios.map(u => <option key={u.user_id} value={u.user_id}>{u.nome_completo}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Relato</label>
                    <textarea
                      className="w-full px-3 py-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all min-h-[100px] resize-none leading-tight"
                      placeholder="DETALHES DA OCORRÊNCIA..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      className="h-8 bg-black/5 dark:bg-white/5 text-muted-foreground/50 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                    >
                      {saving ? "..." : "SÓ REGISTRAR"}
                    </button>
                    <button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      className="h-10 bg-primary text-primary-foreground rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 active:scale-[0.98]"
                    >
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Download size={14} /> SALVAR E GERAR PDF</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between mb-1 px-1">
                <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest">Registros Recentes</h3>
                <div className="text-[8px] font-black text-primary/60 uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/5">
                  {ocorrencias.length} Unidades
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {ocorrencias.length === 0 ? (
                  <div className="py-16 text-center bg-black/5 dark:bg-white/5 border border-dashed border-border/10 rounded-2xl opacity-40">
                    <FileText size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nenhuma ocorrência</p>
                  </div>
                ) : (
                  ocorrencias.map(oc => (
                    <div key={oc.id} className="group bg-card border border-border/10 rounded-xl p-2.5 hover:border-primary/20 transition-all shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary/40 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                          <Building2 size={16} />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="font-black text-[14px] text-foreground uppercase tracking-tight truncate">{oc.empresas.nome_empresa}</h4>
                          <div className="flex flex-wrap items-center gap-3 text-[8px] font-black text-muted-foreground/60 uppercase">
                            <span className="flex items-center gap-1 text-primary/60">
                              <LayoutGrid size={9} /> {oc.departamento}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={9} /> {formatDateBR(oc.data_ocorrencia)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={9} /> {oc.usuarios?.nome_completo?.split(' ')[0] || "SISTEMA"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGeneratePdf(oc)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all"
                          title="DOWNLOAD PDF"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(oc.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                          title="EXCLUIR"
                        >
                          <Trash2 size={12} />
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
    </div>
  );
};

export default OcorrenciasPage;
