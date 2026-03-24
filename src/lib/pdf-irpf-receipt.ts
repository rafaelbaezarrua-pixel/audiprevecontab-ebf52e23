import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { IRPFRecord } from "@/types/irpf";
import { numeroPorExtenso } from "@/utils/extenso";
import { DEFAULT_HEADER } from "@/constants/reports";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import logoCaduceu from "@/assets/logo-caduceu.png";

export const generateIRPFReceipt = async (record: IRPFRecord) => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
    doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
    doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
    doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

    const pageWidth = doc.internal.pageSize.getWidth();
    const halfHeight = doc.internal.pageSize.getHeight() / 2;

    const logoToUse = DEFAULT_HEADER.logoUrl || logoCaduceu;
    const imgData = await new Promise<HTMLImageElement | string>((resolve) => {
        if (logoToUse.startsWith('data:')) resolve(logoToUse);
        else {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(logoCaduceu);
            img.src = logoToUse;
        }
    });
    let formatImg = 'PNG';
    if (typeof imgData === 'string' && imgData.startsWith('data:image/jpeg')) formatImg = 'JPEG';

    const drawReceipt = (startY: number) => {
        const MARGIN = 15;
        
        // Header
        doc.addImage(imgData, formatImg, MARGIN, startY + 5, 20, 20);
        doc.setFont("Ubuntu", "bold");
        doc.setFontSize(14);
        doc.text(DEFAULT_HEADER.title, pageWidth / 2 + 10, startY + 12, { align: "center" });
        doc.setFont("Ubuntu", "normal");
        doc.setFontSize(10);
        doc.text(DEFAULT_HEADER.subtitle, pageWidth / 2 + 10, startY + 17, { align: "center" });
        doc.setFontSize(9);
        doc.text(DEFAULT_HEADER.address, pageWidth / 2, startY + 23, { align: "center" });
        doc.text(DEFAULT_HEADER.contact, pageWidth / 2, startY + 27, { align: "center" });

        // Divider
        doc.setLineWidth(0.5);
        doc.line(MARGIN, startY + 31, pageWidth - MARGIN, startY + 31);
        
        // Top right Amount
        const amountFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.valor_a_pagar || 0);
        doc.setFont("Ubuntu", "bold");
        doc.setFontSize(12);
        doc.text(amountFormatted, pageWidth - MARGIN, startY + 45, { align: "right" });

        // Title
        doc.setFontSize(14);
        doc.text("RECIBO", MARGIN, startY + 50);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, startY + 51, MARGIN + 22, startY + 51);

        // Box Info
        const boxY = startY + 58;
        const boxH = 45;
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.roundedRect(MARGIN, boxY, pageWidth - (MARGIN*2), boxH, 3, 3);
        
        doc.setFontSize(12);
        doc.setFont("Ubuntu", "normal");
        const clientName = record.nome_completo.toUpperCase();
        doc.text(`Recebemos de`, MARGIN + 5, boxY + 10);
        doc.setFont("Ubuntu", "bold");
        doc.text(clientName, MARGIN + 37, boxY + 10);

        doc.setFont("Ubuntu", "normal");
        doc.text(`A importância de`, MARGIN + 5, boxY + 22);
        const amountExtenso = numeroPorExtenso(record.valor_a_pagar || 0);
        doc.setFont("Ubuntu", "bold");
        doc.text(`${amountFormatted} (${amountExtenso}). OOOOOOOOO`, MARGIN + 40, boxY + 22);
        doc.setDrawColor(200, 0, 0); // Red line for the Xs representation
        let xLen = doc.getTextWidth(`${amountFormatted} (${amountExtenso}). OOOOOOOOO`) + MARGIN + 40 - 25;
        // doc.line(MARGIN + 40 + doc.getTextWidth(`${amountFormatted} (${amountExtenso}).`), boxY + 22.5, xLen, boxY + 22.5); // Removed red underline

        doc.setFont("Ubuntu", "normal");
        doc.text(`Referente`, MARGIN + 5, boxY + 34);
        doc.setFont("Ubuntu", "bold");
        doc.text(`DECLARAÇÃO DE IRPF ${record.ano_exercicio}`, MARGIN + 28, boxY + 34);

        doc.setFont("Ubuntu", "normal");
        doc.text("Para maior clareza firmamos o presente recibo.", MARGIN, boxY + 60);

        const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        doc.text(`Fazenda Rio Grande-Pr., ${dataAtual}.`, pageWidth - MARGIN, boxY + 85, { align: "right" });

        doc.setFont("Ubuntu", "bold");
        doc.text("AUDIPREVE CONTABILIDADE", pageWidth - MARGIN, boxY + 110, { align: "right" });
    };

    drawReceipt(0);
    
    // Draw cutting line
    doc.setLineDash([5, 5]);
    doc.setDrawColor(150, 150, 150);
    doc.line(5, halfHeight, pageWidth - 5, halfHeight);
    doc.setLineDash([]);
    doc.setDrawColor(0, 0, 0);

    drawReceipt(halfHeight);

    doc.save(`Recibo_IRPF_${record.nome_completo.replace(/\s+/g, "_")}.pdf`);
};
