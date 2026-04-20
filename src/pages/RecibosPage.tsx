import React, { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateBR } from "@/lib/utils";
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

    <div className="space-y-2 animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 shrink-0">
        <div className="space-y-1 -mt-4">
          <div className="flex items-center gap-2">
             <h1 className="header-title">Emissão de <span className="text-primary/90 font-black">Recibos</span></h1>
             <FavoriteToggleButton moduleId="recibos" />
          </div>
          <p className="text-[14px] font-bold text-muted-foreground/70 text-shadow-sm">Gerador de recibos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* NEW RECEIPT FORM */}
        <div className="lg:col-span-4 h-fit">
          <div className="module-card space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                     <Receipt size={14} />
                </div>
                <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Novo Recibo</h2>
                </div>
            </div>

            <div className="space-y-1">
                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Pagador</label>
                    <input
                        type="text"
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all uppercase placeholder:opacity-20"
                        value={nomeCliente}
                        onChange={(e) => setNomeCliente(e.target.value)}
                        placeholder="NOME COMPLETO OU EMPRESA"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[11px] font-black text-primary outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                            value={valor || ""}
                            onChange={(e) => setValor(Number(e.target.value) || 0)}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Emissão</label>
                        <input
                            type="date"
                            className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                            value={dataEmissao}
                            onChange={(e) => setDataEmissao(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Referente a</label>
                    <textarea
                        rows={3}
                        className="w-full px-3 py-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none uppercase leading-tight placeholder:opacity-20"
                        value={referente}
                        onChange={(e) => setReferente(e.target.value)}
                        placeholder="DETALHAMENTO DOS SERVIÇOS OU PRODUTOS..."
                    />
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSaveAndGenerate}
                        disabled={createRecibo.isPending}
                        className="w-full h-10 bg-primary text-primary-foreground rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
                    >
                        {createRecibo.isPending ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <><Download size={14} /> GERAR E SALVAR</>
                        )}
                    </button>
                </div>
            </div>
          </div>
        </div>

        {/* HISTORY LIST */}
        <div className="lg:col-span-8 space-y-3">
          <div className="module-card !p-0 overflow-hidden shadow-sm flex flex-col h-fit">
            {/* History Header Controls */}
            <div className="px-4 py-3 border-b border-border/10 bg-black/5 dark:bg-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <History size={14} className="text-primary" />
                        <h2 className="text-[10px] font-black uppercase tracking-widest">Histórico de Emissões</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" />
                            <input 
                                type="text" 
                                placeholder="PROCURAR..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="h-8 pl-9 pr-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 transition-all w-full sm:w-44"
                            />
                        </div>
                        <input 
                            type="month" 
                            value={competenciaFiltro}
                            onChange={e => setCompetenciaFiltro(e.target.value)}
                            className="h-8 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase text-primary outline-none focus:ring-1 focus:ring-primary/20"
                        />
                    </div>
                </div>
            </div>

            {/* List Container */}
            <div className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto no-scrollbar">
                {loadingRecibos ? (
                    <div className="py-20 text-center space-y-2">
                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Sincronizando registros...</p>
                    </div>
                ) : filteredRecibos.length === 0 ? (
                    <div className="py-16 text-center bg-black/5 dark:bg-white/5 border border-dashed border-border/10 rounded-xl opacity-30">
                        <Filter size={24} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Competência Vazia</p>
                    </div>
                ) : (
                    filteredRecibos.map(recibo => (
                        <div key={recibo.id} className="group bg-card border border-border/10 hover:border-primary/20 p-2.5 rounded-xl transition-all flex items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-all text-primary/40 group-hover:text-primary">
                                    <Receipt size={18} />
                                </div>
                                <div className="space-y-0.5 flex-1 min-w-0">
                                    <h3 className="font-black text-[11px] text-foreground uppercase tracking-tight truncate">{recibo.nome_cliente}</h3>
                                    <div className="flex items-center gap-4 text-[8px] font-black uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5 text-muted-foreground/60"><Calendar size={10} /> {formatDateBR(recibo.data_emissao)}</span>
                                        <span className="text-primary bg-primary/5 px-1.5 py-0.5 rounded-lg border border-primary/10">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recibo.valor)}
                                        </span>
                                    </div>
                                    <p className="text-[8px] font-bold text-muted-foreground/40 uppercase truncate">
                                        {recibo.referente}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={() => generatePDF({ 
                                        nome: recibo.nome_cliente, 
                                        valor: recibo.valor, 
                                        referente: recibo.referente, 
                                        dataEmissao: recibo.data_emissao 
                                    })}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all"
                                    title="REIMPRIMIR"
                                >
                                    <Download size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(recibo.id)}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all"
                                    title="EXCLUIR"
                                >
                                    <Trash2 size={14} />
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
