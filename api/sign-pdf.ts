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
    const { pdfBase64, pfxBase64, passphrase, visualText } = req.body;

    if (!pdfBase64 || !pfxBase64 || !passphrase) {
      return res.status(400).json({ error: 'Parâmetros ausentes (pdfBase64, pfxBase64, passphrase)' });
    }

    // Remover possíveis prefixos "data:application/pdf;base64," ou "data:application/x-pkcs12;base64,"
    const cleanBase64 = (str: string) => {
      if (str.includes(',')) return str.split(',')[1];
      return str.trim();
    };

    // 1. Carregar o PDF e Normalizar (Reconstruir Tabela XREF)
    const pdfBuffer = Buffer.from(cleanBase64(pdfBase64), 'base64');
    
    // Log do final do arquivo para depuração
    const tail = pdfBuffer.slice(-60).toString();
    console.log('[API Sign] PDF Tail:', tail.replace(/\n/g, '\\n').replace(/\r/g, '\\r'));

    // Reconstruir o PDF com pdf-lib para garantir compatibilidade do XREF
    // 'useObjectStreams: false' garante um formato mais básico que o plainAddPlaceholder entende melhor
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Adicionar texto visual no rodapé (Opcional, mas vamos manter agora que o PDF será reconstruído)
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const text = visualText || `Assinado digitalmente por Audipreve\nData: ${new Date().toLocaleString('pt-BR')}`;
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    
    lastPage.drawText(text, {
      x: 30,
      y: 30,
      size: 9,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
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
