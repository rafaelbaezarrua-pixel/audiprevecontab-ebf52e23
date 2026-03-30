import { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, pfxBase64, passphrase, visualText, x, y, pageIndex } = req.body;

    if (!pdfBase64 || !pfxBase64 || !passphrase) {
      return res.status(400).json({ error: 'Parâmetros ausentes (pdfBase64, pfxBase64, passphrase)' });
    }

    // 1. Carregar o PDF e Normalizar
    const pdfBuffer = Buffer.from(cleanBase64(pdfBase64), 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Configurar Fonte
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const text = visualText || `Assinado digitalmente por Audipreve\nData: ${new Date().toLocaleString('pt-BR')}`;
    
    // 2. Aplicar Assinatura Visual (Se fornecido)
    const pages = pdfDoc.getPages();
    const targetPageIndex = (pageIndex !== undefined && pageIndex < pages.length) ? pageIndex : pages.length - 1;
    const lastPage = pages[targetPageIndex];
    const { width, height } = lastPage.getSize();

    // Converter percentual para pontos (PDF usa pontos, onde 1pt = 1/72 pol)
    // No PDF, (0,0) é canto inferior esquerdo. No navegador/viewport, (0,0) é superior esquerdo.
    const finalX = x !== undefined ? (x / 100) * width : 30;
    const finalY = y !== undefined ? height - ((y / 100) * height) : 30;

    lastPage.drawText(text, {
      x: finalX,
      y: Math.max(10, finalY - 20), // Ajuste para não sair da borda inferior
      size: 8,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    });

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
