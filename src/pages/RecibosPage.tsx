import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { Receipt, Download } from "lucide-react";

import { numeroPorExtenso } from "@/utils/extenso";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { DEFAULT_HEADER } from "@/constants/reports";

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

    const handleGenerateReceipt = async () => {
        if (!nomeCliente || valor <= 0 || !referente) {
            toast.error("Preencha todos os campos corretamente (Nome, Valor e Referente).");
            return;
        }

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
                const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
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
                const clientNameUpper = nomeCliente.toUpperCase();
                doc.text(`Recebemos de`, MARGIN + 5, boxY + 9);
                doc.setFont("Ubuntu", "bold");
                doc.text(clientNameUpper, MARGIN + 37, boxY + 9);

                doc.setFont("Ubuntu", "normal");
                doc.text(`A importância de`, MARGIN + 5, boxY + 20);
                const amountExtenso = numeroPorExtenso(valor);
                doc.setFont("Ubuntu", "bold");
                doc.text(`${amountFormatted} (${amountExtenso}).`, MARGIN + 40, boxY + 20);
                doc.setDrawColor(200, 0, 0); // Red line for xs

                doc.setFont("Ubuntu", "normal");
                doc.text(`Referente`, MARGIN + 5, boxY + 31);
                doc.setFont("Ubuntu", "bold");
                doc.text(referente.toUpperCase(), MARGIN + 28, boxY + 31);

                doc.setFont("Ubuntu", "normal");
                doc.text("Para maior clareza firmamos o presente recibo.", MARGIN, boxY + 50);

                const dt = new Date(dataEmissao + "T12:00:00");
                const dataFormatada = format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                doc.text(`Fazenda Rio Grande-Pr., ${dataFormatada}.`, pageWidth - MARGIN, boxY + 65, { align: "right" });

                doc.setFont("Ubuntu", "bold");
                doc.text("AUDIPREVE CONTABILIDADE", pageWidth - MARGIN, boxY + 80, { align: "right" });
            };

            // Via Cliente (topo)
            drawReceiptBlock(0);
            
            // Tesoura (corte)
            doc.setLineDash([5, 5]);
            doc.setDrawColor(150, 150, 150);
            doc.line(5, halfHeight, pageWidth - 5, halfHeight);
            doc.setLineDash([]);
            doc.setDrawColor(0, 0, 0);

            // Via Contabilidade (baixo)
            drawReceiptBlock(halfHeight);

            doc.save(`Recibo_${nomeCliente.replace(/\s+/g, "_")}.pdf`);
            toast.success("Recibo gerado com sucesso!");

        } catch (error: any) {
            console.error("Erro ao gerar recibo", error);
            toast.error("Erro ao gerar PDF: " + error.message);
        }
    };

    if (loadingConfig) {
        return <div className="p-8 flex items-center justify-center">Carregando módulo...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Recibos</h1>
                    <p className="text-muted-foreground">Emissão avulsa de recibos com 2 vias</p>
                </div>
            </div>

            <div className="module-card max-w-2xl">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2 mb-6">
                    <Receipt size={20} /> Preencha as Informações do Recibo
                </h2>

                <div className="space-y-5">
                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">Recebemos de (Nome do Cliente)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                            value={nomeCliente}
                            onChange={(e) => setNomeCliente(e.target.value)}
                            placeholder="Ex: João da Silva"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-1 block">A importância de (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                                value={valor || ""}
                                onChange={(e) => setValor(Number(e.target.value) || 0)}
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-1 block">Data de Emissão</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                                value={dataEmissao}
                                onChange={(e) => setDataEmissao(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-muted-foreground mb-1 block">Referente a</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                            value={referente}
                            onChange={(e) => setReferente(e.target.value)}
                            placeholder="Ex: Honorários contábeis ref. Mês 03/2026"
                        />
                    </div>

                    <div className="pt-6 border-t border-border flex justify-end">
                        <button
                            onClick={handleGenerateReceipt}
                            className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <Download size={18} />
                            Gerar PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecibosPage;
