import React, { useState, useEffect, useMemo } from "react";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateBR, formatMonthYearBR } from "@/lib/utils";
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
    Printer,
    FolderOpen
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
import GerenciadorArquivosPage from "./GerenciadorArquivosPage";

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

                const vcT = `VENCIMENTO: ${formatDateBR(dataVencimento)}`;
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
    <div className="animate-fade-in relative pb-10">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/2 rounded-full blur-[120px] -z-10" />

      <div className="space-y-6">
        {/* Main Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="header-title">Controle de <span className="text-primary/90 font-black">Faturamento</span></h1>
            <FavoriteToggleButton moduleId="faturamento" />
          </div>
          <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest text-shadow-sm">Emissão de notas, faturas e relatórios mensais.</p>
        </div>
      </div>

      <Tabs defaultValue="emissao" className="w-full space-y-4">
        <TabsList className="flex bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 overflow-x-auto no-scrollbar w-full sm:w-auto h-auto gap-1">
          {[
            { value: "emissao", label: "Emissão", icon: DollarSign },
            { value: "historico", label: "Histórico", icon: History },
            { value: "relacao", label: "Relação", icon: TableIcon },
            { value: "pastas", label: "Pastas", icon: FolderOpen }
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <tab.icon size={12} className="mr-2" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="emissao" className="animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FORMULÁRIO COMPACTO */}
            <div className="lg:col-span-1">
              <div className="module-card space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <FileText size={14} />
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-foreground">Novo Faturamento</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Cliente</label>
                    <Select value={nomeCliente} onValueChange={setNomeCliente} disabled={loadingEmpresas}>
                      <SelectTrigger className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black uppercase tracking-tight focus:ring-1 focus:ring-primary/20 transition-all">
                        <SelectValue placeholder={loadingEmpresas ? "CARREGANDO..." : "SELECIONE A EMPRESA"} />
                      </SelectTrigger>
                      <SelectContent>
                        {empresas.map((emp) => (
                          <SelectItem key={emp.id} value={emp.nome_empresa} className="text-[10px] font-bold uppercase">
                            {emp.nome_empresa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Emissão</label>
                      <input
                        type="date"
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none focus:ring-1 focus:ring-primary/20 font-mono"
                        value={dataEmissao}
                        onChange={e => setDataEmissao(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Vencimento</label>
                      <input
                        type="date"
                        className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black text-primary outline-none focus:ring-1 focus:ring-primary/20 font-mono"
                        value={dataVencimento}
                        onChange={e => setDataVencimento(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1">Arquivo PDF</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept=".pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleFileChange}
                      />
                      <div className={`border border-dashed transition-all p-6 text-center rounded-xl ${selectedFile ? 'border-primary bg-primary/5' : 'border-border/20 bg-black/5 dark:bg-white/5 group-hover:border-primary/40'}`}>
                        <UploadCloud size={20} className={`mx-auto mb-2 ${selectedFile ? 'text-primary' : 'text-muted-foreground/30'}`} />
                        <p className="text-[9px] font-black text-foreground uppercase tracking-widest truncate max-w-full">
                          {selectedFile ? selectedFile.name : "ANEXAR ORIGINAL"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateProcessedPDF}
                    disabled={isGenerating || !selectedFile}
                    className="w-full h-10 mt-2 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Download size={14} /> GERAR E SALVAR</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
               {/* MINI STATS COMPACTOS */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Geral", value: stats.total, icon: DollarSign, color: "text-primary" },
                    { label: "Mês Atual", value: stats.monthly[competenciaFiltro] || 0, icon: Calendar, color: "text-emerald-500" }
                  ].map((stat, i) => (
                    <div key={i} className="module-card !p-3 flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 ${stat.color}`}>
                        <stat.icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest truncate">{stat.label}</p>
                        <p className="text-[12px] font-black text-foreground tracking-tight">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(stat.value)}</p>
                      </div>
                    </div>
                  ))}
               </div>

               <div className="module-card">
                  <div className="flex items-center gap-2 mb-4">
                    <History size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Últimos Lançamentos</h3>
                  </div>
                  <div className="space-y-2">
                    {allFaturamentos?.slice(0, 5).map(f => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-border/5 hover:bg-primary/[0.02] transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2 size={12} className="text-muted-foreground/30" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black uppercase truncate max-w-[200px]">{f.nome_cliente}</span>
                            <span className="text-[8px] font-black text-muted-foreground/50 tracking-widest">{formatDateBR(f.data_emissao)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-primary">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(f.valor))}</span>
                           <Download size={12} className="text-muted-foreground/20 group-hover:text-primary transition-colors cursor-pointer" />
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-all" />
              <input
                type="text"
                placeholder="BUSCAR NO HISTÓRICO..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-black/10 dark:bg-white/5 border border-border/10 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 bg-black/10 dark:bg-white/5 p-1 rounded-xl border border-border/10 shadow-inner h-10">
               <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest ml-2">Competência:</span>
               <input
                 type="month"
                 value={competenciaFiltro}
                 onChange={e => setCompetenciaFiltro(e.target.value)}
                 className="bg-transparent text-[10px] font-black uppercase outline-none px-2 text-primary"
               />
            </div>
          </div>

          <div className="module-card !p-0 overflow-hidden border-border/10">
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] no-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card border-b border-border/10 z-10 shadow-sm">
                  <tr className="bg-black/5 dark:bg-white/5">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Cliente/Empresa</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Emissão</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Vencimento</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Valor</th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {filteredHistory.map(f => (
                    <tr key={f.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Building2 size={14} className="text-muted-foreground/30" />
                          <span className="text-[10px] font-black uppercase text-foreground/80">{f.nome_cliente}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground/80">{formatDateBR(f.data_emissao)}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-rose-500/80">{formatDateBR(f.data_vencimento)}</td>
                      <td className="px-4 py-2.5">
                         <span className="text-[10px] font-black text-primary">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Number(f.valor))}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                            onClick={() => {
                               // Funcionalidade de download viria aqui
                            }}
                          >
                            <Download size={12} />
                          </button>
                          <button 
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">
                        NENHUM REGISTRO NESTA COMPETÊNCIA
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="relacao" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* CONFIGURAÇÃO DA RELAÇÃO */}
                <div className="xl:col-span-4 space-y-4">
                    <div className="module-card space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/10">
                           <Calendar size={14} className="text-primary" />
                           <h4 className="text-[10px] font-black uppercase tracking-widest">Gerador de Relação</h4>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Empresa</label>
                          <Select value={relacaoEmpresaId} onValueChange={setRelacaoEmpresaId}>
                            <SelectTrigger className="h-9 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black focus:ring-1 focus:ring-primary/20">
                              <SelectValue placeholder="SELECIONE..." />
                            </SelectTrigger>
                            <SelectContent>
                              {empresas.map(e => (
                                <SelectItem key={e.id} value={e.id} className="text-[10px] font-bold uppercase">{e.nome_empresa}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Início</label>
                            <input type="month" value={relacaoInicio} onChange={e => setRelacaoInicio(e.target.value)} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Fim</label>
                            <input type="month" value={relacaoFim} onChange={e => setRelacaoFim(e.target.value)} className="w-full h-9 px-3 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[10px] font-black outline-none" />
                          </div>
                        </div>

                        <button onClick={handleGenerateRange} className="w-full h-9 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black/20 dark:hover:bg-white/10 transition-all">
                          GERAR LISTA AUTOMÁTICA
                        </button>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Data Emissão</label>
                                <input type="date" value={relacaoDataEmissao} onChange={e => setRelacaoDataEmissao(e.target.value)} className="w-full h-9 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest ml-1">Válido Até</label>
                                <input type="date" value={relacaoDataVencimento} onChange={e => setRelacaoDataVencimento(e.target.value)} className="w-full h-10 px-2 bg-black/10 dark:bg-white/5 border border-border/10 rounded-lg text-[9px] font-black" />
                            </div>
                        </div>

                        <button
                          onClick={() => generateRelacaoPDF()}
                          disabled={isGeneratingRelacao}
                          className="w-full h-10 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                           {isGeneratingRelacao ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Printer size={14} /> IMPRIMIR RELAÇÃO</>}
                        </button>
                    </div>

                    <div className="module-card !p-4 bg-primary/[0.03] border-primary/10">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Total da Relação</span>
                            <span className="text-2xl font-black text-primary tracking-tight">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(totalRelacao)}</span>
                        </div>
                    </div>
                </div>

                {/* TABELA DE ITENS DA RELAÇÃO */}
                <div className="xl:col-span-8 space-y-4">
                    <div className="module-card overflow-hidden">
                       <div className="flex items-center justify-between mb-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest">Itens de Faturamento</h5>
                          <button onClick={handleAddRelacaoItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary transition-all hover:text-white">
                             <PlusCircle size={12} /> Adicionar Mês
                          </button>
                       </div>

                       <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                          {relacaoItems.map((item, idx) => (
                             <div key={item.id} className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2 rounded-xl border border-border/5 group animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex-1">
                                   <input
                                     type="text"
                                     placeholder="Mês (Ex: Janeiro)"
                                     value={item.mes}
                                     onChange={e => handleUpdateRelacaoItem(item.id, "mes", e.target.value)}
                                     className="w-full h-8 bg-card border border-border/10 rounded-lg px-2 text-[10px] font-black uppercase tracking-tight outline-none focus:ring-1 focus:ring-primary/20"
                                   />
                                </div>
                                <div className="w-24">
                                   <input
                                     type="text"
                                     placeholder="Ano"
                                     value={item.ano}
                                     onChange={e => handleUpdateRelacaoItem(item.id, "ano", e.target.value)}
                                     className="w-full h-8 bg-card border border-border/10 rounded-lg px-2 text-[10px] font-black text-center outline-none focus:ring-1 focus:ring-primary/20"
                                   />
                                </div>
                                <div className="w-32">
                                   <div className="relative">
                                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/40">R$</span>
                                     <input
                                       type="number"
                                       value={item.valor}
                                       placeholder="0,00"
                                       onChange={e => handleUpdateRelacaoItem(item.id, "valor", e.target.value)}
                                       className="w-full h-8 bg-card border border-border/10 rounded-lg pl-6 pr-2 text-[10px] font-black text-right outline-none focus:ring-1 focus:ring-primary/20"
                                     />
                                   </div>
                                </div>
                                <button onClick={() => handleRemoveRelacaoItem(item.id)} className="p-2 text-rose-500/30 hover:text-rose-500 transition-colors">
                                   <X size={14} />
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="module-card !p-0 overflow-hidden">
                       <div className="bg-black/5 dark:bg-white/5 px-4 py-2 border-b border-border/10">
                          <h6 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Histórico de Relações Geradas</h6>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                          {relacoes?.map(r => (
                             <div key={r.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all group border-b border-border/5 last:border-0">
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase truncate max-w-[300px]">{r.nome_empresa}</span>
                                   <span className="text-[8px] font-black text-muted-foreground/40 tracking-widest uppercase">{formatMonthYearBR(r.periodo_inicio)} ATÉ {formatMonthYearBR(r.periodo_fim)}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-primary">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(r.valor_total)}</span>
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => generateRelacaoPDF(r)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                                          <Printer size={12} />
                                       </button>
                                       <button onClick={() => deleteRelacao.mutate(r.id)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                          <Trash2 size={12} />
                                       </button>
                                    </div>
                                </div>
                             </div>
                          ))}
                        </div>
                    </div>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="pastas" className="animate-in fade-in slide-in-from-bottom-2">
            <GerenciadorArquivosPage />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default FaturamentoPage;
