import React, { useState, useEffect, useMemo } from "react";
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
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Recibos</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                        <Download size={14} className="text-primary" /> Emissão avulsa de recibos com 2 vias e histórico
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULÁRIO DE GERAÇÃO */}
                <div className="lg:col-span-1">
                    <div className="module-card sticky top-24">
                        <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-6">
                            <Receipt size={20} /> Novo Recibo
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 block ml-1">Recebemos de</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                                    value={nomeCliente}
                                    onChange={(e) => setNomeCliente(e.target.value)}
                                    placeholder="Nome do cliente/empresa"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 block ml-1">Importância (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                                        value={valor || ""}
                                        onChange={(e) => setValor(Number(e.target.value) || 0)}
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 block ml-1">Data de Emissão</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={dataEmissao}
                                        onChange={(e) => setDataEmissao(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5 block ml-1">Referente a</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                                    value={referente}
                                    onChange={(e) => setReferente(e.target.value)}
                                    placeholder="Descrição detalhada do recebimento..."
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSaveAndGenerate}
                                    disabled={createRecibo.isPending}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {createRecibo.isPending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Download size={18} /> GERAR E SALVAR</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO */}
                <div className="lg:col-span-2 flex flex-col h-full max-h-[calc(100vh-220px)]">
                    {/* Cabeçalho do Histórico - Fixo no topo do container */}
                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <History size={20} className="text-primary shrink-0" />
                                <h2 className="text-lg font-bold">Histórico</h2>
                                {loadingRecibos && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-48">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-xs focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                                <input 
                                    type="month" 
                                    value={competenciaFiltro}
                                    onChange={e => setCompetenciaFiltro(e.target.value)}
                                    className="px-3 py-2 border border-border rounded-lg bg-background text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Lista de Recibos - Scrollable */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                        {loadingRecibos ? (
                            <div className="py-20 text-center space-y-3">
                                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                            </div>
                        ) : filteredRecibos.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-muted/5">
                                <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter size={20} className="text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground font-medium">Nenhum recibo encontrado</p>
                                <p className="text-xs text-muted-foreground/60">Altere o mês ou faça uma nova busca.</p>
                            </div>
                        ) : (
                            filteredRecibos.map(recibo => (
                                <div key={recibo.id} className="group bg-card border border-border hover:border-primary/30 hover:shadow-md p-5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <Receipt size={18} className="text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-card-foreground leading-tight mb-1">{recibo.nome_cliente}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {format(parseISO(recibo.data_emissao), "dd/MM/yy")}</span>
                                                <span className="flex items-center gap-1 font-black text-primary">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recibo.valor)}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded-md mt-2 italic line-clamp-1">
                                                {recibo.referente}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={() => generatePDF({ 
                                                nome: recibo.nome_cliente, 
                                                valor: recibo.valor, 
                                                referente: recibo.referente, 
                                                dataEmissao: recibo.data_emissao 
                                            })}
                                            title="Baixar PDF novamente"
                                            className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(recibo.id)}
                                            title="Excluir do histórico"
                                            className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all shadow-sm"
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
    );
};

export default RecibosPage;
