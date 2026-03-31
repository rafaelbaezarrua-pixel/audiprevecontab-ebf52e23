import { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';

const cleanBase64 = (str: string) => {
  if (!str) return '';
  return str.includes(',') ? str.split(',')[1] : str;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, pfxBase64, passphrase, visualText, x, y, pageIndex, location } = req.body;

    if (!pdfBase64 || !pfxBase64 || !passphrase) {
      return res.status(400).json({ error: 'Parâmetros ausentes (pdfBase64, pfxBase64, passphrase)' });
    }

    // 1. Carregar o PDF e Normalizar
    const pdfBuffer = Buffer.from(cleanBase64(pdfBase64), 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Configurar Fonte
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    // 2. Aplicar Assinatura Visual (Selo Moderno)
    const pages = pdfDoc.getPages();
    const targetPageIndex = (pageIndex !== undefined && pageIndex < pages.length) ? pageIndex : pages.length - 1;
    const lastPage = pages[targetPageIndex];
    const { width, height } = lastPage.getSize();

    // Coordenadas calculadas
    const finalX = x !== undefined ? (x / 100) * width : 30;
    const finalY = y !== undefined ? height - ((y / 100) * height) : 30;

    // Design do Selo Premium
    const sealWidth = 200;
    const sealHeight = 70;
    const adjustedY = Math.max(10, finalY - (sealHeight / 2));

    // 1. Sombra do Selo (Blur simulado com retângulos)
    lastPage.drawRectangle({
      x: finalX + 1.5,
      y: adjustedY - 1.5,
      width: sealWidth,
      height: sealHeight,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.4
    });

    // 2. Fundo do Selo
    lastPage.drawRectangle({
      x: finalX,
      y: adjustedY,
      width: sealWidth,
      height: sealHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    // 3. Barra Lateral de Identidade (Laranja Audipreve)
    lastPage.drawRectangle({
      x: finalX,
      y: adjustedY,
      width: 4,
      height: sealHeight,
      color: rgb(0.95, 0.4, 0.1), // Laranja mais vibrante
    });

    // 4. Textos do Selo com Hierarquia Visual
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

    // Título
    lastPage.drawText('ASSINADO DIGITALMENTE', {
      x: finalX + 12,
      y: adjustedY + sealHeight - 14,
      size: 7,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Nome da Empresa
    lastPage.drawText('AUDIPREVE CONTABILIDADE LTDA', {
      x: finalX + 12,
      y: adjustedY + sealHeight - 28,
      size: 8.5,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Detalhes Técnicos
    const detailsFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const drawDetail = (text: string, yPos: number) => {
      lastPage.drawText(text, {
        x: finalX + 12,
        y: adjustedY + sealHeight - yPos,
        size: 7,
        font: detailsFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    };

    drawDetail('CNPJ 09.242.904/0001-06', 40);
    drawDetail(`Data/Hora: ${timestamp}`, 52);
    drawDetail(`Local: ${location || 'Fazenda Rio Grande - PR'}`, 62);

    const pdfBufferNormalized = Buffer.from(await pdfDoc.save({ useObjectStreams: false }));
    console.log('[API Sign] PDF normalizado. Novo tamanho:', pdfBufferNormalized.length);

    // 2. Adicionar o Placeholder de Assinatura
    console.log('[API Sign] Adicionando placeholder...');
    const pdfWithPlaceholder = await plainAddPlaceholder({
      pdfBuffer: pdfBufferNormalized,
      reason: 'Assinatura Digital Audipreve',
      signatureLength: 8192,
    });

    // 3. Realizar a Assinatura Real
    const pfxBuffer = Buffer.from(cleanBase64(pfxBase64), 'base64');
    const signer = new P12Signer(pfxBuffer, { passphrase });

    console.log('[API Sign] Chamando signpdf...');
    const signedPdfBuffer = await new SignPdf().sign(pdfWithPlaceholder, signer);

    // 4. Retornar o resultado
    const signedBase64 = signedPdfBuffer.toString('base64');
    
    console.log('[API Sign] Sucesso total.');
    
    res.status(200).json({ 
      success: true, 
      signedPdfBase64: signedBase64 
    });

  } catch (error: any) {
    console.error('[API Sign] Erro crítico:', error);
    res.status(500).json({ 
      error: 'Falha na assinatura digital', 
      details: error.message || error 
    });
  }
}
