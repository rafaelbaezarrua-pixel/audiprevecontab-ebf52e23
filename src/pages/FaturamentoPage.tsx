import React, { useState, useEffect, useMemo } from "react";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { toast } from "sonner";
import {
    DollarSign,
    Download,
    History,
    Trash2,
    Calendar,
    Search,
    Filter,
    UploadCloud,
    FileText,
    Building2,
    Table as TableIcon,
    PlusCircle,
    X,
    Printer
} from "lucide-react";

import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { DEFAULT_HEADER } from "@/constants/reports";
import { useFaturamentos, Faturamento } from "@/hooks/useFaturamentos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useRelacaoFaturamentos, RelacaoFaturamento, RelacaoItem as RelacaoItemType } from "@/hooks/useRelacaoFaturamentos";

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

const FaturamentoPage: React.FC = () => {
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [nomeCliente, setNomeCliente] = useState("");
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
    const [dataVencimento, setDataVencimento] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Histórico
    const [search, setSearch] = useState("");
    const [competenciaFiltro, setCompetenciaFiltro] = useState(new Date().toISOString().slice(0, 7));
    const { faturamentos, isLoading: loadingHistory, createFaturamento, deleteFaturamento } = useFaturamentos(competenciaFiltro);
    const { faturamentos: allFaturamentos, isLoading: loadingAll } = useFaturamentos();
    const { empresas, loading: loadingEmpresas } = useEmpresas("societario");

    // Relação de Faturamento Real
    const { relacoes, createRelacao, deleteRelacao } = useRelacaoFaturamentos();

    interface RelacaoItem {
        id: string;
        mes: string;
        ano: string;
        valor: number;
    }
    const [relacaoEmpresaId, setRelacaoEmpresaId] = useState("");
    const [relacaoInicio, setRelacaoInicio] = useState(new Date().toISOString().slice(0, 7));
    const [relacaoFim, setRelacaoFim] = useState(new Date().toISOString().slice(0, 7));
    const [relacaoDataEmissao, setRelacaoDataEmissao] = useState(new Date().toISOString().split('T')[0]);
    const [relacaoDataVencimento, setRelacaoDataVencimento] = useState("");

    const [relacaoItems, setRelacaoItems] = useState<RelacaoItem[]>([
        { id: Math.random().toString(36).substring(2, 9), mes: "Janeiro", ano: new Date().getFullYear().toString(), valor: 0 }
    ]);
    const [isGeneratingRelacao, setIsGeneratingRelacao] = useState(false);

    const handleAddRelacaoItem = () => {
        setRelacaoItems([...relacaoItems, {
            id: Math.random().toString(36).substring(2, 9),
            mes: "",
            ano: new Date().getFullYear().toString(),
            valor: 0
        }]);
    };

    const handleRemoveRelacaoItem = (id: string) => {
        if (relacaoItems.length <= 1) return;
        setRelacaoItems(relacaoItems.filter(item => item.id !== id));
    };

    const handleUpdateRelacaoItem = (id: string, field: keyof RelacaoItem, value: any) => {
        setRelacaoItems(relacaoItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleGenerateRange = () => {
        const start = new Date(relacaoInicio + "-02"); // Avoid timezone issues
        const end = new Date(relacaoFim + "-02");
        if (start > end) {
            toast.error("A data de início deve ser anterior à data de fim.");
            return;
        }

        const items: RelacaoItem[] = [];
        let curr = new Date(start);
        while (curr <= end) {
            const mesNome = format(curr, "MMMM", { locale: ptBR });
            items.push({
                id: Math.random().toString(36).substring(2, 9),
                mes: mesNome.charAt(0).toUpperCase() + mesNome.slice(1),
                ano: curr.getFullYear().toString(),
                valor: 0
            });
            curr.setMonth(curr.getMonth() + 1);
        }
        setRelacaoItems(items);
    };

    const totalRelacao = relacaoItems.reduce((acc, current) => acc + (Number(current.valor) || 0), 0);

    const stats = useMemo(() => {
        if (!allFaturamentos) return { monthly: {}, total: 0 };
        const monthly: Record<string, number> = {};
        let total = 0;
        allFaturamentos.forEach(f => {
            monthly[f.competencia] = (monthly[f.competencia] || 0) + Number(f.valor);
            total += Number(f.valor);
        });
        return { monthly, total };
    }, [allFaturamentos]);

    useEffect(() => {
        if (dataEmissao) {
            const date = parseISO(dataEmissao);
            const vencimento = addDays(date, 30);
            setDataVencimento(format(vencimento, "yyyy-MM-dd"));
        }
    }, [dataEmissao]);

    useEffect(() => {
        if (relacaoDataEmissao) {
            const date = parseISO(relacaoDataEmissao);
            const vencimento = addDays(date, 30);
            setRelacaoDataVencimento(format(vencimento, "yyyy-MM-dd"));
        }
    }, [relacaoDataEmissao]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== "application/pdf") {
                toast.error("Por favor, selecione um arquivo PDF.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const generateProcessedPDF = async () => {
        if (!selectedFile || !nomeCliente || !dataEmissao || !dataVencimento) {
            toast.error("Preencha todos os campos e selecione um arquivo PDF.");
            return;
        }

        setIsGenerating(true);
        try {
            // Load the uploaded PDF
            const fileArrayBuffer = await selectedFile.arrayBuffer();
            const externalPdf = await PDFDocument.load(fileArrayBuffer);

            // Create a new PDF
            const pdfDoc = await PDFDocument.create();
            pdfDoc.registerFontkit(fontkit);

            // Load Ubuntu fonts
            const ubuntuRegularBytes = Uint8Array.from(atob(UbuntuRegular), c => c.charCodeAt(0));
            const ubuntuBoldBytes = Uint8Array.from(atob(UbuntuBold), c => c.charCodeAt(0));
            const ubuntuRegular = await pdfDoc.embedFont(ubuntuRegularBytes);
            const ubuntuBold = await pdfDoc.embedFont(ubuntuBoldBytes);

            // Funçao auxiliar para converter Data URL em Uint8Array
            const dataUrlToUint8Array = (dataUrl: string) => {
                const base64 = dataUrl.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            };

            // Load Logo
            const logoToUse = headerConfig.logoUrl || logoCaduceu;
            let embossedLogo;
            try {
                let logoBytes: ArrayBuffer;
                if (logoToUse.startsWith('data:')) {
                    logoBytes = dataUrlToUint8Array(logoToUse).buffer;
                } else {
                    logoBytes = await fetch(logoToUse).then(res => res.arrayBuffer());
                }

                if (logoToUse.includes('image/png') || logoToUse.toLowerCase().endsWith('.png')) {
                    embossedLogo = await pdfDoc.embedPng(logoBytes);
                } else {
                    embossedLogo = await pdfDoc.embedJpg(logoBytes);
                }
            } catch (e) {
                console.warn("Could not load preferred logo, falling back to bundled asset", e);
                try {
                    const fallbackRes = await fetch(logoCaduceu);
                    const fallbackBytes = await fallbackRes.arrayBuffer();
                    embossedLogo = await pdfDoc.embedPng(fallbackBytes);
                } catch (f) { console.error("Critical: Logo fallback failed"); }
            }

            // Copy pages from external PDF and wrap each
            const externalPages = await pdfDoc.copyPages(externalPdf, externalPdf.getPageIndices());

            for (const externalPage of externalPages) {
                const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
                const { width, height } = page.getSize();

                // --- CABEÇALHO PADRÃO AUDIPREVE (Sync Ocorrências) ---
                const margin = 36;
                const mmToPt = 2.83;

                const logoW = (headerConfig.logoWidth || 20) * mmToPt;
                const logoH = (headerConfig.logoHeight || 20) * mmToPt;
                const logoX = (headerConfig.logoX || 20) * mmToPt;
                const logoY = height - ((headerConfig.logoY || 10) * mmToPt) - logoH;

                if (embossedLogo) {
                    page.drawImage(embossedLogo, {
                        x: logoX,
                        y: logoY,
                        width: logoW,
                        height: logoH,
                    });
                }

                const titleFontSize = headerConfig.titleFontSize || 22;
                const subFontSize = headerConfig.subtitleFontSize || 10;
                const infoFS = headerConfig.infoFontSize || 8;

                // Offset de 10mm conforme Ocorrências (+28.3 pts)
                page.drawText(headerConfig.title, {
                    x: (width - ubuntuBold.widthOfTextAtSize(headerConfig.title, titleFontSize)) / 2 + 28.3,
                    y: height - (20 * mmToPt),
                    size: titleFontSize,
                    font: ubuntuBold,
                });

                page.drawText(headerConfig.subtitle, {
                    x: (width - ubuntuRegular.widthOfTextAtSize(headerConfig.subtitle, subFontSize)) / 2 + 28.3,
                    y: height - (26 * mmToPt),
                    size: subFontSize,
                    font: ubuntuRegular,
                });

                page.drawText(headerConfig.address, {
                    x: (width - ubuntuRegular.widthOfTextAtSize(headerConfig.address, infoFS)) / 2,
                    y: height - (34 * mmToPt),
                    size: infoFS,
                    font: ubuntuRegular,
                });

                page.drawText(headerConfig.contact, {
                    x: (width - ubuntuRegular.widthOfTextAtSize(headerConfig.contact, infoFS)) / 2,
                    y: height - (38 * mmToPt),
                    size: infoFS,
                    font: ubuntuRegular,
                });

                const lineY = height - (42 * mmToPt);
                page.drawLine({
                    start: { x: margin, y: lineY },
                    end: { x: width - margin, y: lineY },
                    thickness: 0.5,
                    color: rgb(0, 0, 0),
                });

                // --- EMBED CONTENT (Espaço de 2 linhas / múltiplo 1 = 48pts) ---
                const gap = 48;
                const footerSpace = 100;
                const availableHeight = lineY - gap - footerSpace;
                const contentWidth = width - (margin * 2);

                const sourceWidth = externalPage.getWidth();
                const sourceHeight = externalPage.getHeight();
                const scale = Math.min(contentWidth / sourceWidth, availableHeight / sourceHeight);

                // Em pdf-lib, para desenhar uma página sobre outra, ela deve ser primeiro "incorporada" (embedded)
                const embeddedPage = await pdfDoc.embedPage(externalPage);

                page.drawPage(embeddedPage, {
                    x: (width - (sourceWidth * scale)) / 2,
                    y: lineY - gap - (sourceHeight * scale),
                    width: sourceWidth * scale,
                    height: sourceHeight * scale,
                });

                // --- FOOTER (Padrão) ---
                const dt = parseISO(dataEmissao);
                const dataFormatada = format(dt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                const footerText = `Fazenda Rio Grande/PR, ${dataFormatada}.`;
                page.drawText(footerText, { x: margin, y: 60, size: 10, font: ubuntuRegular });

                const vcT = `VENCIMENTO: ${format(parseISO(dataVencimento), "dd/MM/yyyy")}`;
                page.drawText(vcT, { x: width - margin - ubuntuBold.widthOfTextAtSize(vcT, 10), y: 60, size: 10, font: ubuntuBold });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `Faturamento_${nomeCliente.replace(/\s+/g, "_")}.pdf`;
            link.click();

            // Save to History
            await createFaturamento.mutateAsync({
                nome_cliente: nomeCliente,
                valor: 0,
                data_emissao: dataEmissao,
                data_vencimento: dataVencimento,
                competencia: dataEmissao.slice(0, 7)
            });

            toast.success("Faturamento processado, baixado e salvo no histórico!");

            // Reset form
            setSelectedFile(null);
            setNomeCliente("");
            setDataVencimento("");

        } catch (error: unknown) {
            console.error("Erro ao processar PDF:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(`Erro ao gerar o PDF: ${errorMessage}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateRelacaoPDF = async (histData?: RelacaoFaturamento) => {
        const margin = 36; // 1.27cm = 36 points
        const empresaId = histData ? histData.empresa_id : relacaoEmpresaId;
        const rawItems = histData ? histData.itens : relacaoItems;

        // Filtrar apenas itens que tenham algum dos campos minimamente preenchidos ou considerar todos se vier por histórico
        const items = histData ? rawItems : rawItems.filter(i => i.mes.trim() !== "" || i.ano.trim() !== "" || i.valor > 0);

        if (!empresaId) {
            toast.error("Por favor, selecione uma empresa na lista antes de gerar.");
            return;
        }

        if (items.length === 0) {
            toast.error("A lista de faturamento está vazia. Adicione pelo menos um mês.");
            return;
        }

        const hasInvalidItems = items.some(i => !i.mes?.trim() || !i.ano?.trim());
        if (hasInvalidItems) {
            toast.error("Existem itens na lista com Mês ou Ano em branco.");
            return;
        }

        const emissao = histData ? histData.data_emissao : relacaoDataEmissao;
        const vencimento = histData ? histData.data_vencimento : relacaoDataVencimento;
        const total = histData ? histData.valor_total : totalRelacao;

        const empresaSelecionada = empresas.find(e => e.id === empresaId);
        if (!empresaSelecionada) return;

        setIsGeneratingRelacao(true);
        try {
            const pdfDoc = await PDFDocument.create();
            pdfDoc.registerFontkit(fontkit);

            const ubuntuRegularBytes = Uint8Array.from(atob(UbuntuRegular), c => c.charCodeAt(0));
            const ubuntuBoldBytes = Uint8Array.from(atob(UbuntuBold), c => c.charCodeAt(0));
            const fontReg = await pdfDoc.embedFont(ubuntuRegularBytes);
            const fontBold = await pdfDoc.embedFont(ubuntuBoldBytes);

            const page = pdfDoc.addPage([595.28, 841.89]);
            const { width, height } = page.getSize();

            const margin = 36; // 1.27cm = 36 points
            const mmToPt = 2.83; // Conversion factor

            // Funçao auxiliar para converter Data URL em Uint8Array
            const dataUrlToUint8Array = (dataUrl: string) => {
                const base64 = dataUrl.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            };

            // --- CABEÇALHO PADRÃO AUDIPREVE (Baseado em Ocorrências/Referência) ---
            const logoToUse = headerConfig.logoUrl || logoCaduceu;
            let embossedLogo;
            try {
                let logoBytes: ArrayBuffer;
                if (logoToUse.startsWith('data:')) {
                    logoBytes = dataUrlToUint8Array(logoToUse).buffer;
                } else {
                    logoBytes = await fetch(logoToUse).then(res => res.arrayBuffer());
                }

                if (logoToUse.includes('image/png') || logoToUse.toLowerCase().endsWith('.png')) {
                    embossedLogo = await pdfDoc.embedPng(logoBytes);
                } else {
                    embossedLogo = await pdfDoc.embedJpg(logoBytes);
                }
            } catch (e) {
                console.warn("Logo failed to load, falling back", e);
                try {
                    const fallbackRes = await fetch(logoCaduceu);
                    const fallbackBytes = await fallbackRes.arrayBuffer();
                    embossedLogo = await pdfDoc.embedPng(fallbackBytes);
                } catch (f) { console.error("Critical: Logo fallback failed"); }
            }

            // Coordenadas em mm do módulo de Ocorrências
            const logoW = (headerConfig.logoWidth || 20) * mmToPt;
            const logoH = (headerConfig.logoHeight || 20) * mmToPt;
            const logoX = (headerConfig.logoX || 20) * mmToPt;
            const logoY = height - ((headerConfig.logoY || 10) * mmToPt) - logoH;

            if (embossedLogo) {
                page.drawImage(embossedLogo, {
                    x: logoX,
                    y: logoY,
                    width: logoW,
                    height: logoH,
                });
            }

            // Textos do Cabeçalho (Sincronizado rigorosamente com Ocorrências)
            const titleFontSize = headerConfig.titleFontSize || 22;
            const subFontSize = headerConfig.subtitleFontSize || 10;
            const infoFS = headerConfig.infoFontSize || 8;

            const addressY = height - (34 * mmToPt);
            const contactY = height - (38 * mmToPt);
            const lineY = height - (42 * mmToPt);

            // Offset de 10mm (28.3 pts) para equilibrar a logo à esquerda
            page.drawText(headerConfig.title, {
                x: (width - fontBold.widthOfTextAtSize(headerConfig.title, titleFontSize)) / 2 + 28.3,
                y: height - (20 * mmToPt),
                size: titleFontSize,
                font: fontBold,
            });

            page.drawText(headerConfig.subtitle, {
                x: (width - fontReg.widthOfTextAtSize(headerConfig.subtitle, subFontSize)) / 2 + 28.3,
                y: height - (26 * mmToPt),
                size: subFontSize,
                font: fontReg,
            });

            page.drawText(headerConfig.address, {
                x: (width - fontReg.widthOfTextAtSize(headerConfig.address, infoFS)) / 2,
                y: addressY,
                size: infoFS,
                font: fontReg,
            });

            page.drawText(headerConfig.contact, {
                x: (width - fontReg.widthOfTextAtSize(headerConfig.contact, infoFS)) / 2,
                y: contactY,
                size: infoFS,
                font: fontReg,
            });

            // Linha divisória idêntica ao Ocorrências (42mm de distância do topo)
            page.drawLine({
                start: { x: margin, y: lineY },
                end: { x: width - margin, y: lineY },
                thickness: 0.5,
                color: rgb(0, 0, 0)
            });

            // --- BLOCO DE CONTEÚDO (Posicionado fixo após o cabeçalho) ---
            const rowHeight = 15;
            const companyInfoHeight = 35; // Nome + CNPJ
            const gapLineToCompany = 48; // 2 linhas (espaçamento simples) conforme solicitado
            const gapCompanyToTitle = 48; // 2 linhas antes do título
            const titleAreaHeight = 25;
            const gapTitleToTable = 15; // 1 linha
            const tableHeight = (items.length * rowHeight) + 20;
            const gapTableToFooter = 30; // 2 parágrafos antes da assinatura
            const footerHeight = 20;

            // Iniciar o conteúdo exatamente 2 linhas após a linha do cabeçalho
            let currentY = lineY - gapLineToCompany;

            // Dados da Empresa (BOLD + UPPERCASE)
            const nomeEmpresaUpper = empresaSelecionada.nome_empresa.toUpperCase();
            page.drawText(nomeEmpresaUpper, { x: margin, y: currentY, size: 10, font: fontBold });
            currentY -= 12;
            page.drawText(`CNPJ: ${empresaSelecionada.cnpj || 'Não informado'}`, { x: margin, y: currentY, size: 9, font: fontReg });

            currentY -= (gapCompanyToTitle);

            // Título Relatório (Centered + Underlined)
            const tituloRel = "RELAÇÃO DE FATURAMENTO REAL";
            const trW = fontBold.widthOfTextAtSize(tituloRel, 12);
            page.drawText(tituloRel, {
                x: (width - trW) / 2, y: currentY, size: 12, font: fontBold
            });
            page.drawLine({
                start: { x: (width - trW) / 2, y: currentY - 2 },
                end: { x: (width + trW) / 2, y: currentY - 2 },
                thickness: 1,
                color: rgb(0, 0, 0)
            });

            currentY -= gapTitleToTable;

            // Tabela
            page.drawText("Mês", { x: margin, y: currentY, size: 9, font: fontBold });
            page.drawText("Ano", { x: margin + 70, y: currentY, size: 9, font: fontBold });
            const labelTotalR = "Total R$";
            const ltW = fontBold.widthOfTextAtSize(labelTotalR, 9);
            page.drawText(labelTotalR, { x: width - margin - ltW, y: currentY, size: 9, font: fontBold });

            currentY -= rowHeight;

            items.forEach(item => {
                const valFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(item.valor) || 0);

                page.drawText(item.mes, { x: margin, y: currentY, size: 10, font: fontReg });
                page.drawText(item.ano, { x: margin + 70, y: currentY, size: 10, font: fontReg });

                const vW = fontReg.widthOfTextAtSize(valFormat, 10);
                page.drawText(valFormat, { x: width - margin - vW, y: currentY, size: 10, font: fontReg });

                const dotS = margin + 110;
                const dotE = width - margin - vW - 10;
                let dx = dotS;
                while (dx < dotE) {
                    page.drawText(".", { x: dx, y: currentY, size: 6, font: fontReg });
                    dx += 4;
                }
                currentY -= rowHeight;
                if (currentY < margin + 30) {
                    const p2 = pdfDoc.addPage([595.28, 841.89]);
                    currentY = height - margin - 50;
                }
            });

            currentY -= 5;
            page.drawText("TOTAL", { x: margin, y: currentY, size: 11, font: fontBold });
            const totalF = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(total);
            const totalW = fontBold.widthOfTextAtSize(totalF, 11);
            page.drawText(totalF, { x: width - margin - totalW, y: currentY, size: 11, font: fontBold });

            const dST = margin + 110;
            const dET = width - margin - totalW - 10;
            let dxt = dST;
            while (dxt < dET) {
                page.drawText(".", { x: dxt, y: currentY, size: 6, font: fontBold });
                dxt += 4;
            }

            currentY -= gapTableToFooter;

            // Rodapé
            const dtE = parseISO(emissao);
            const dataEF = format(dtE, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
            const footerT = `Fazenda Rio Grande - Pr., ${dataEF}`;
            const ftW = fontReg.widthOfTextAtSize(footerT, 10);
            page.drawText(footerT, { x: width - margin - ftW, y: currentY, size: 10, font: fontReg });

            currentY -= 15;
            const dtV = parseISO(vencimento);
            const dataVF = format(dtV, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
            const valT = `Válido até dia ${dataVF}`;
            const vW = fontReg.widthOfTextAtSize(valT, 10);
            page.drawText(valT, { x: width - margin - vW, y: currentY, size: 10, font: fontReg });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `Relacao_Faturamento_${empresaSelecionada.nome_empresa.replace(/\s+/g, "_")}.pdf`;
            link.click();

            // Salvar no Histórico se for uma nova geração
            if (!histData) {
                await createRelacao.mutateAsync({
                    empresa_id: relacaoEmpresaId,
                    nome_empresa: empresaSelecionada.nome_empresa,
                    periodo_inicio: relacaoInicio,
                    periodo_fim: relacaoFim,
                    data_emissao: relacaoDataEmissao,
                    data_vencimento: relacaoDataVencimento,
                    itens: relacaoItems.map(i => ({ mes: i.mes, ano: i.ano, valor: i.valor })) as RelacaoItemType[],
                    valor_total: totalRelacao
                });
            }

            toast.success(histData ? "Cópia da relação gerada com sucesso!" : "Relação de faturamento gerada e salva no histórico!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao gerar a relação de faturamento.");
        } finally {
            setIsGeneratingRelacao(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deseja realmente excluir este faturamento do histórico?")) return;
        try {
            await deleteFaturamento.mutateAsync(id);
            toast.success("Faturamento removido do histórico.");
        } catch (err: unknown) {
            console.error("Erro ao excluir faturamento:", err);
            toast.error("Erro ao excluir faturamento.");
        }
    };

    const filteredHistory = useMemo(() => {
        return faturamentos.filter(f =>
            f.nome_cliente.toLowerCase().includes(search.toLowerCase())
        );
    }, [faturamentos, search]);

    if (loadingConfig) {
        return <div className="p-8 flex items-center justify-center">Carregando configurações...</div>;
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
             <h1 className="header-title">Controle de <span className="text-primary/90">Faturamento</span></h1>
             <FavoriteToggleButton moduleId="faturamento" />
          </div>
          <p className="subtitle-premium">Emissão de notas, faturas e relatórios de faturamento mensal.</p>
        </div>
      </div>

      <Tabs defaultValue="emissao" className="w-full space-y-6">
        <TabsList className="flex bg-muted/30 p-1.5 rounded-xl border border-border/60 overflow-x-auto no-scrollbar w-full sm:w-auto h-auto">
          <TabsTrigger
            value="emissao"
            className="px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border transition-all whitespace-nowrap"
          >
            <DollarSign size={16} className="mr-2 inline" /> Emissão
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border transition-all whitespace-nowrap"
          >
            <History size={16} className="mr-2 inline" /> Histórico
          </TabsTrigger>
          <TabsTrigger
            value="relacao"
            className="px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border transition-all whitespace-nowrap"
          >
            <TableIcon size={16} className="mr-2 inline" /> Relação de Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emissao" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULÁRIO */}
                <div className="lg:col-span-1">
                    <div className="card-premium">
                        <h2 className="text-lg font-black text-primary flex items-center gap-3 mb-6 uppercase tracking-widest">
                            <div className="p-2 rounded-lg bg-primary/10"><FileText size={20} /></div>
                            Novo Faturamento
                        </h2>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Selecione o Cliente</label>
                                <Select value={nomeCliente} onValueChange={setNomeCliente} disabled={loadingEmpresas}>
                                    <SelectTrigger className="w-full h-14 px-4 border border-border/60 rounded-xl bg-card text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all">
                                        <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Selecione a empresa"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {empresas.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.nome_empresa}>
                                                {emp.nome_empresa}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Emissão</label>
                                    <input
                                        type="date"
                                        className="w-full h-14 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                                        value={dataEmissao}
                                        onChange={e => setDataEmissao(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vencimento</label>
                                    <input
                                        type="date"
                                        className="w-full h-14 px-4 bg-muted/30 border border-border/60 rounded-2xl text-xs font-bold text-primary focus:ring-2 focus:ring-primary outline-none transition-all"
                                        value={dataVencimento}
                                        onChange={e => setDataVencimento(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Documento PDF</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileChange}
                                    />
                                    <div className={`border-2 border-dashed ${selectedFile ? 'border-primary bg-primary/5 shadow-inner' : 'border-border/60 group-hover:border-primary/50 bg-card'} rounded-xl p-10 transition-all text-center`}>
                                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${selectedFile ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            <UploadCloud size={28} />
                                        </div>
                                        <p className="text-xs font-black text-card-foreground uppercase tracking-widest leading-relaxed">
                                            {selectedFile ? selectedFile.name : "Clique para anexar o PDF"}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground mt-2 uppercase tracking-tight">O sistema processará o cabeçalho automaticamente</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={generateProcessedPDF}
                                    disabled={isGenerating || !selectedFile}
                                    className="w-full h-18 bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    {isGenerating ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> PROCESSANDO...</>
                                    ) : (
                                        <><Download size={20} /> GERAR E SALVAR FATURAMENTO</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                     <div className="card-premium h-full flex flex-col justify-center items-center opacity-70 border-dashed">
                        <div className="p-8 text-center max-w-sm">
                            <Building2 size={48} className="text-primary/30 mx-auto mb-4" />
                            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Informações Adicionais</h3>
                            <p className="text-xs text-muted-foreground/60 mt-3 leading-relaxed">Selecione um arquivo PDF de faturamento para que o sistema possa aplicar o cabeçalho personalizado da Audipreve automaticamente.</p>
                        </div>
                     </div>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="historico" className="animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-muted/30 p-6 rounded-3xl border border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                            <History size={24} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-lg font-black uppercase tracking-widest">Histórico de Emissões</h2>
                            <p className="text-xs text-muted-foreground">Registros de faturamentos processados recentemente.</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filtrar por cliente..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-12 pl-12 pr-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <input
                            type="month"
                            value={competenciaFiltro}
                            onChange={e => setCompetenciaFiltro(e.target.value)}
                            className="h-12 px-4 bg-primary/10 border border-primary/20 rounded-xl text-xs font-black text-primary outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loadingHistory ? (
                        <div className="col-span-full py-32 text-center">
                             <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Carregando histórico...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="col-span-full py-32 text-center bg-card border border-dashed border-border/60 rounded-[2.5rem] opacity-60">
                            <Filter size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhum registro encontrado para este período</p>
                        </div>
                    ) : (
                        filteredHistory.map(item => (
                            <div key={item.id} className="group bg-card border border-border/60 hover:border-primary/40 p-6 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-primary/5 flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="font-black text-xs uppercase tracking-tight text-card-foreground">{item.nome_cliente}</h3>
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                                                <Calendar size={12} /> {format(parseISO(item.data_emissao), "dd/MM/yyyy")}
                                            </span>
                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                                                VENC: {format(parseISO(item.data_vencimento), "dd/MM/yyyy")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </TabsContent>

        <TabsContent value="relacao" className="animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORMULÁRIO DE RELAÇÃO */}
                <div className="lg:col-span-1">
                    <div className="card-premium">
                        <h2 className="text-lg font-black text-primary flex items-center gap-3 mb-6 uppercase tracking-widest">
                            <div className="p-2 rounded-lg bg-primary/10"><Building2 size={20} /></div>
                            Dados da Relação
                        </h2>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empresa</label>
                                <Select value={relacaoEmpresaId} onValueChange={setRelacaoEmpresaId} disabled={loadingEmpresas}>
                                    <SelectTrigger className="w-full h-14 px-4 border border-border/60 rounded-xl bg-card text-xs font-bold focus:ring-2 focus:ring-primary outline-none transition-all">
                                        <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Selecione a empresa"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {empresas.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.nome_empresa}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Período Início</label>
                                    <input
                                        type="month"
                                        className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                                        value={relacaoInicio}
                                        onChange={(e) => setRelacaoInicio(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Período Fim</label>
                                    <input
                                        type="month"
                                        className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                                        value={relacaoFim}
                                        onChange={(e) => setRelacaoFim(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Emissão</label>
                                    <input
                                        type="date"
                                        className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                                        value={relacaoDataEmissao}
                                        onChange={(e) => setRelacaoDataEmissao(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vencimento</label>
                                    <input
                                        type="date"
                                        className="w-full h-12 px-4 bg-muted/30 border border-border/60 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary font-black text-primary"
                                        value={relacaoDataVencimento}
                                        onChange={(e) => setRelacaoDataVencimento(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/40">
                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Itens do Faturamento</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerateRange}
                                            className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Calendar size={14} /> Gerar Período
                                        </button>
                                        <button
                                            onClick={handleAddRelacaoItem}
                                            className="flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 border border-border/60 transition-all flex items-center justify-center gap-2"
                                        >
                                            <PlusCircle size={14} /> Add Manual
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {relacaoItems.map((item) => (
                                        <div key={item.id} className="flex gap-3 items-center bg-card border border-border/60 p-4 rounded-2xl relative group hover:shadow-lg transition-all">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    className="h-10 px-3 bg-muted/20 border border-border/40 rounded-xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary"
                                                    placeholder="Mês"
                                                    value={item.mes}
                                                    onChange={(e) => handleUpdateRelacaoItem(item.id, "mes", e.target.value)}
                                                />
                                                <input
                                                    type="text"
                                                    className="h-10 px-3 bg-muted/20 border border-border/40 rounded-xl text-[11px] font-bold outline-none focus:ring-1 focus:ring-primary"
                                                    placeholder="Ano"
                                                    value={item.ano}
                                                    onChange={(e) => handleUpdateRelacaoItem(item.id, "ano", e.target.value)}
                                                />
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        className="w-full h-11 px-4 bg-primary/5 border border-primary/10 rounded-xl text-[11px] font-black text-primary outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="Valor R$ 0,00"
                                                        value={item.valor || ""}
                                                        onChange={(e) => handleUpdateRelacaoItem(item.id, "valor", Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveRelacaoItem(item.id)}
                                                className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/60">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Soma Total</span>
                                    <span className="text-xl font-black text-primary tracking-tight">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRelacao)}
                                    </span>
                                </div>

                                <button
                                    onClick={() => generateRelacaoPDF()}
                                    disabled={isGeneratingRelacao}
                                    className="w-full h-18 bg-primary text-primary-foreground font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    <Printer size={20} />
                                    {isGeneratingRelacao ? "GERANDO DOCUMENTO..." : "GERAR RELAÇÃO PDF"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HISTÓRICO DE RELAÇÕES */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-4 bg-muted/30 p-6 rounded-3xl border border-border/50">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                            <TableIcon size={24} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-lg font-black uppercase tracking-widest">Relatórios Gerados</h2>
                            <p className="text-xs text-muted-foreground">Histórico completo de relações de faturamento real.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relacoes.length === 0 ? (
                            <div className="col-span-full py-32 text-center bg-card border border-dashed border-border/60 rounded-[2.5rem] opacity-60">
                                <History size={48} className="mx-auto mb-4 text-muted-foreground/30" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhuma relação gerada ainda</p>
                            </div>
                        ) : (
                            relacoes.map((rel) => (
                                <div key={rel.id} className="group bg-card border border-border/60 hover:border-primary/40 p-6 rounded-[2rem] transition-all hover:shadow-xl hover:shadow-primary/5 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <FileText size={24} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <h3 className="font-black text-xs uppercase tracking-tight text-card-foreground line-clamp-1">{rel.nome_empresa}</h3>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-[9px] bg-muted px-2 py-0.5 rounded-full font-black text-muted-foreground uppercase tracking-tighter">
                                                    {rel.periodo_inicio} — {rel.periodo_fim}
                                                </span>
                                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rel.valor_total)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => generateRelacaoPDF(rel)}
                                            className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Imprimir Novamente"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm("Excluir esta relação do histórico?")) {
                                                    deleteRelacao.mutate(rel.id);
                                                }
                                            }}
                                            className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
    );
};

export default FaturamentoPage;
