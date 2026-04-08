import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Receipt, Download, History, Trash2, Calendar, Search, Filter } from "lucide-react";

import { numeroPorExtenso } from "@/utils/extenso";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { DEFAULT_HEADER } from "@/constants/reports";
import { useRecibos, Recibo } from "@/hooks/useRecibos";

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

const RecibosPage: React.FC = () => {
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [nomeCliente, setNomeCliente] = useState("");
    const [valor, setValor] = useState<number>(0);
    const [referente, setReferente] = useState("");
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
    
    // Filtros de Histórico
    const [competenciaFiltro, setCompetenciaFiltro] = useState(new Date().toISOString().slice(0, 7));
    const [search, setSearch] = useState("");

    const { recibos, isLoading: loadingRecibos, createRecibo, deleteRecibo } = useRecibos(competenciaFiltro);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();
                if (data?.value) {
                    setHeaderConfig(JSON.parse(data.value));
                }
            } catch (err) {
                console.error("Erro ao carregar configurações de cabeçalho", err);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const generatePDF = async (data: { nome: string, valor: number, referente: string, dataEmissao: string }) => {
        try {
            const doc = new jsPDF("p", "mm", "a4");
            doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
            doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
            doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
            doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

            const pageWidth = doc.internal.pageSize.getWidth();
            const halfHeight = doc.internal.pageSize.getHeight() / 2;

            const logoToUse = headerConfig.logoUrl || logoCaduceu;
            const imgData = await new Promise<HTMLImageElement | string>((resolve) => {
                if (logoToUse.startsWith('data:')) resolve(logoToUse);
                else {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(logoCaduceu);
                    img.src = logoToUse;
                }
            });
            let formatImg = 'PNG';
            if (typeof imgData === 'string' && imgData.startsWith('data:image/jpeg')) formatImg = 'JPEG';

            const drawReceiptBlock = (startY: number) => {
                const MARGIN = 15;
                
                // --- CABEÇALHO PADRÃO ---
                try {
                    doc.addImage(imgData, formatImg, headerConfig.logoX, startY + headerConfig.logoY, headerConfig.logoWidth, headerConfig.logoHeight);
                } catch(e) {
                    doc.addImage(logoCaduceu, 'PNG', headerConfig.logoX, startY + headerConfig.logoY, headerConfig.logoWidth, headerConfig.logoHeight);
                }

                doc.setFont("Ubuntu", "bold");
                doc.setFontSize(headerConfig.titleFontSize);
                doc.text(headerConfig.title, pageWidth / 2 + 10, startY + 20, { align: "center" });

                doc.setFontSize(headerConfig.subtitleFontSize);
                doc.setFont("Ubuntu", "normal");
                doc.text(headerConfig.subtitle, pageWidth / 2 + 10, startY + 26, { align: "center" });

                doc.setFontSize(headerConfig.infoFontSize);
                doc.text(headerConfig.address, pageWidth / 2, startY + 34, { align: "center" });
                doc.text(headerConfig.contact, pageWidth / 2, startY + 38, { align: "center" });

                // Divider
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.line(10, startY + 42, pageWidth - 10, startY + 42);
                
                // --- CONTEUDO RECIBO ---
                const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.valor);
                doc.setFont("Ubuntu", "bold");
                doc.setFontSize(12);
                doc.text(amountFormatted, pageWidth - MARGIN, startY + 50, { align: "right" });

                // Title
                doc.setFontSize(14);
                doc.text("RECIBO", MARGIN, startY + 52);
                doc.setLineWidth(0.5);
                doc.line(MARGIN, startY + 53, MARGIN + 22, startY + 53);

                // Box Info
                const boxY = startY + 58;
                const boxH = 40;
                doc.setDrawColor(0);
                doc.setLineWidth(0.5);
                doc.roundedRect(MARGIN, boxY, pageWidth - (MARGIN*2), boxH, 3, 3);
                
                doc.setFontSize(12);
                doc.setFont("Ubuntu", "normal");
                const clientNameUpper = data.nome.toUpperCase();
                doc.text(`Recebemos de`, MARGIN + 5, boxY + 9);
                doc.setFont("Ubuntu", "bold");
                const clientLines = doc.splitTextToSize(clientNameUpper, pageWidth - MARGIN * 2 - 45);
                doc.text(clientLines, MARGIN + 37, boxY + 9);

                const clientHeight = (clientLines.length - 1) * 5;

                doc.setFont("Ubuntu", "normal");
                const importanceY = boxY + 20 + clientHeight;
                doc.text(`A importância de`, MARGIN + 5, importanceY);
                const amountExtenso = numeroPorExtenso(data.valor);
                doc.setFont("Ubuntu", "bold");
                const importanceLines = doc.splitTextToSize(`${amountFormatted} (${amountExtenso}).`, pageWidth - MARGIN * 2 - 45);
                doc.text(importanceLines, MARGIN + 40, importanceY);

                const importanceHeight = (importanceLines.length - 1) * 5;

                const referenteY = boxY + 31 + clientHeight + importanceHeight;
                doc.setFont("Ubuntu", "normal");
                doc.text(`Referente`, MARGIN + 5, referenteY);
                doc.setFont("Ubuntu", "bold");
                
                // Split text to fit margin
                const maxWidth = pageWidth - (MARGIN * 2) - 35;
                const referenteLines = doc.splitTextToSize(data.referente.toUpperCase(), maxWidth);
                doc.text(referenteLines, MARGIN + 28, referenteY);

                const referenteHeightTotal = (referenteLines.length - 1) * 5;

                doc.setFont("Ubuntu", "normal");
                const footerY = boxY + 50 + clientHeight + importanceHeight + referenteHeightTotal;
                doc.text("Para maior clareza firmamos o presente recibo.", MARGIN, footerY);

                const dt = parseISO(data.dataEmissao);
                const dataFormatada = format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                doc.text(`Fazenda Rio Grande-Pr., ${dataFormatada}.`, pageWidth - MARGIN, footerY + 15, { align: "right" });

                doc.setFont("Ubuntu", "bold");
                doc.text("AUDIPREVE CONTABILIDADE", pageWidth - MARGIN, footerY + 30, { align: "right" });
            };

            drawReceiptBlock(0); // Via Cliente
            
            (doc as any).setLineDash([5, 5]);
            doc.setDrawColor(150, 150, 150);
            doc.line(5, halfHeight, pageWidth - 5, halfHeight);
            (doc as any).setLineDash([]);
            doc.setDrawColor(0, 0, 0);

            drawReceiptBlock(halfHeight); // Via Contabilidade

            doc.save(`Recibo_${data.nome.replace(/\s+/g, "_")}.pdf`);
            return true;
        } catch (error: any) {
            console.error("Erro ao gerar recibo", error);
            toast.error("Erro ao gerar PDF: " + error.message);
            return false;
        }
    };

    const handleSaveAndGenerate = async () => {
        if (!nomeCliente || valor <= 0 || !referente) {
            toast.error("Preencha todos os campos corretamente (Nome, Valor e Referente).");
            return;
        }

        const success = await generatePDF({ nome: nomeCliente, valor, referente, dataEmissao });
        
        if (success) {
            try {
                await createRecibo.mutateAsync({
                    nome_cliente: nomeCliente,
                    valor: valor,
                    referente: referente,
                    data_emissao: dataEmissao,
                    competencia: dataEmissao.slice(0, 7)
                });
                toast.success("Recibo gerado e salvo no histórico!");
                
                // Limpar campos após sucesso
                setNomeCliente("");
                setValor(0);
                setReferente("");
            } catch (err: any) {
                console.error("Erro ao salvar histórico:", err);
                toast.error("PDF gerado, mas erro ao salvar no histórico: " + err.message);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir este recibo do histórico?")) return;
        try {
            await deleteRecibo.mutateAsync(id);
            toast.success("Recibo removido do histórico.");
        } catch (err: any) {
            toast.error("Erro ao excluir: " + err.message);
        }
    };

    const filteredRecibos = useMemo(() => {
        return recibos.filter(r => 
            r.nome_cliente.toLowerCase().includes(search.toLowerCase()) ||
            r.referente.toLowerCase().includes(search.toLowerCase())
        );
    }, [recibos, search]);

    if (loadingConfig) {
        return <div className="p-8 flex items-center justify-center">Carregando módulo...</div>;
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
             <h1 className="header-title">Emissão de <span className="text-primary/90">Recibos</span></h1>
             <FavoriteToggleButton moduleId="recibos" />
          </div>
          <p className="subtitle-premium">Gerador inteligente de recibos com 2 vias automáticas e arquivamento em nuvem.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* NEW RECEIPT FORM */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
          <div className="bg-card border border-primary/20 rounded-[2.5rem] p-10 shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-4 mb-10 border-b border-border/40 pb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                     <Receipt size={28} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-card-foreground uppercase tracking-tight">Novo Recibo</h2>
                    <p className="text-xs text-muted-foreground font-medium">Preencha para gerar as duas vias.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="space-y-1.5 font-ubuntu">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Recebemos de (Cliente/Empresa)</label>
                    <input
                        type="text"
                        className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        placeholder="NOME COMPLETO DO PAGADOR..."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-ubuntu">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-sm font-black text-primary outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu"
                            value={valor || ""}
                            onChange={(e) => setValor(Number(e.target.value) || 0)}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Emissão</label>
                        <input
                            type="date"
                            className="w-full h-12 px-5 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu"
                            value={dataEmissao}
                            onChange={(e) => setDataEmissao(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5 font-ubuntu">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Referente a</label>
                    <textarea
                        rows={4}
                        className="w-full px-5 py-4 bg-muted/30 border border-border/40 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none uppercase leading-relaxed"
                        value={referente}
                        onChange={(e) => setReferente(e.target.value)}
                        placeholder="DESCREVA O MOTIVO DO RECEBIMENTO..."
                    />
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleSaveAndGenerate}
                        disabled={createRecibo.isPending}
                        className="w-full h-16 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 disabled:scale-100"
                    >
                        {createRecibo.isPending ? (
                            <div className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <><Download size={20} /> EMITIR, SALVAR E BAIXAR PDF</>
                        )}
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* HISTORY LIST */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border border-border/60 rounded-[2.5rem] overflow-hidden flex flex-col shadow-sm">
            {/* History Header Controls */}
            <div className="p-8 border-b border-border/40 bg-muted/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                            <History size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-card-foreground uppercase tracking-tight">Histórico de Emissões</h2>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Consulta de registros anteriores</p>
                        </div>
                        {loadingRecibos && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin ml-2" />}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="BUSCAR REGISTRO..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="h-12 pl-12 pr-6 bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full sm:w-64"
                            />
                        </div>
                        <input 
                            type="month" 
                            value={competenciaFiltro}
                            onChange={e => setCompetenciaFiltro(e.target.value)}
                            className="h-12 px-6 bg-card border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-primary focus:ring-2 focus:ring-primary/20 outline-none font-ubuntu"
                        />
                    </div>
                </div>
            </div>

            {/* List Container */}
            <div className="p-8 max-h-[700px] overflow-y-auto no-scrollbar space-y-4 bg-card/50">
                {loadingRecibos ? (
                    <div className="py-32 text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto shadow-xl" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sincronizando histórico...</p>
                    </div>
                ) : filteredRecibos.length === 0 ? (
                    <div className="py-32 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-muted/5 opacity-50">
                        <Filter size={48} className="mx-auto mb-6 text-muted-foreground" />
                        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Nenhum recibo identificado para este período</p>
                        <p className="text-[9px] font-bold text-muted-foreground/60 mt-2">Tente ajustar os filtros ou busque por outro critério.</p>
                    </div>
                ) : (
                    filteredRecibos.map(recibo => (
                        <div key={recibo.id} className="group bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 p-6 rounded-[1.8rem] transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 border border-border/40 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors">
                                    <Receipt size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-black text-sm text-card-foreground uppercase tracking-tight">{recibo.nome_cliente}</h3>
                                    <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                        <span className="flex items-center gap-2 bg-muted/80 px-3 py-1 rounded-full"><Calendar size={12} className="text-primary" /> {format(parseISO(recibo.data_emissao), "dd/MM/yyyy")}</span>
                                        <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recibo.valor)}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground border-l-2 border-primary/20 pl-4 py-1.5 italic uppercase line-clamp-1 max-w-[400px]">
                                        {recibo.referente}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => generatePDF({ 
                                        nome: recibo.nome_cliente, 
                                        valor: recibo.valor, 
                                        referente: recibo.referente, 
                                        dataEmissao: recibo.data_emissao 
                                    })}
                                    className="h-12 px-6 rounded-xl bg-primary/5 text-primary border border-primary/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
                                >
                                    <Download size={16} /> REEMITIR
                                </button>
                                <button 
                                    onClick={() => handleDelete(recibo.id)}
                                    className="h-12 w-12 flex items-center justify-center rounded-xl bg-destructive/5 text-destructive border border-destructive/10 hover:bg-destructive hover:text-white transition-all shadow-sm group-hover:opacity-100 sm:opacity-0"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
    );
};

export default RecibosPage;
