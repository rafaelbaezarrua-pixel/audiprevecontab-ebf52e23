import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { HeaderConfig, DEFAULT_HEADER } from "@/constants/reports";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";
import logoCaduceu from "@/assets/logo-caduceu.png";

export const generatePDFHeader = async (doc: jsPDF, headerConfig?: HeaderConfig) => {
    doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
    doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
    doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
    doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

    const config: HeaderConfig = headerConfig || DEFAULT_HEADER;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Logo and Text
    try {
        const logoToUse = config.logoUrl || logoCaduceu;

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

        doc.addImage(imgData, format, config.logoX, config.logoY, config.logoWidth, config.logoHeight);
    } catch (e) {
        console.warn("Logo blocked by CORS or invalid. Generating PDF without custom logo.", e);
        // Fallback to default if custom url failed
        try {
            if (config.logoUrl) {
                doc.addImage(logoCaduceu, 'PNG', config.logoX, config.logoY, config.logoWidth, config.logoHeight);
            }
        } catch (fallbackError) {
            console.warn("Fallback logo failed", fallbackError);
        }
    }

    doc.setFont("Ubuntu", "bold");
    doc.setFontSize(config.titleFontSize);
    doc.text(config.title, pageWidth / 2 + 10, 20, { align: "center" });

    doc.setFontSize(config.subtitleFontSize);
    doc.setFont("Ubuntu", "normal");
    doc.text(config.subtitle, pageWidth / 2 + 10, 26, { align: "center" });

    doc.setFontSize(config.infoFontSize);
    doc.text(config.address, pageWidth / 2, 34, { align: "center" });
    doc.text(config.contact, pageWidth / 2, 38, { align: "center" });

    // Separator line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, 42, pageWidth - 10, 42);
};

export const applyAutoTable = (doc: jsPDF, head: any[][], body: any[][], startY: number, title?: string) => {
    if (title) {
        doc.setFontSize(10);
        doc.setFont("Ubuntu", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(title, 14, startY + 5);
        startY += 8;
        doc.setTextColor(0, 0, 0);
    }

    autoTable(doc, {
        startY: startY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 9, cellPadding: 2 },
        styles: { font: 'Ubuntu' },
        margin: { horizontal: 5 },
    });

    return (doc as any).lastAutoTable.finalY + 10;
};
