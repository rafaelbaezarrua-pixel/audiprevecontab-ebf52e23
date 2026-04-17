import { VercelRequest, VercelResponse } from '@vercel/node';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SignPdf } from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';

const cleanBase64 = (str: string) => {
  if (!str) return '';
  return str.includes(',') ? str.split(',')[1] : str;
};

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Security Verification: JWT Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.warn('[SECURITY] Tentativa de acesso não autorizado ao sign-pdf');
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  try {
    const { pdfBase64, pfxBase64, passphrase, x, y, pageIndex, location } = req.body;

    if (!pdfBase64 || !pfxBase64 || !passphrase) {
      return res.status(400).json({ error: 'Parâmetros ausentes (pdfBase64, pfxBase64, passphrase)' });
    }

    if (
      typeof pdfBase64 !== 'string' ||
      typeof pfxBase64 !== 'string' ||
      typeof passphrase !== 'string' ||
      pdfBase64.length > 30_000_000 ||
      pfxBase64.length > 10_000_000 ||
      passphrase.length > 256
    ) {
      return res.status(400).json({ error: 'Carga de assinatura inválida.' });
    }

    const pdfBuffer = Buffer.from(cleanBase64(pdfBase64), 'base64');
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const targetPageIndex = pageIndex !== undefined && pageIndex < pages.length ? pageIndex : pages.length - 1;
    const lastPage = pages[targetPageIndex];
    const { width, height } = lastPage.getSize();

    const finalX = x !== undefined ? (x / 100) * width : 30;
    const finalY = y !== undefined ? height - ((y / 100) * height) : 30;

    const sealWidth = 200;
    const sealHeight = 70;
    const adjustedY = Math.max(10, finalY - sealHeight / 2);

    lastPage.drawRectangle({
      x: finalX + 1.5,
      y: adjustedY - 1.5,
      width: sealWidth,
      height: sealHeight,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.4,
    });

    lastPage.drawRectangle({
      x: finalX,
      y: adjustedY,
      width: sealWidth,
      height: sealHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    lastPage.drawRectangle({
      x: finalX,
      y: adjustedY,
      width: 4,
      height: sealHeight,
      color: rgb(0.95, 0.4, 0.1),
    });

    const now = new Date();
    const timestamp = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;

    lastPage.drawText('ASSINADO DIGITALMENTE', {
      x: finalX + 12,
      y: adjustedY + sealHeight - 14,
      size: 7,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    lastPage.drawText('AUDIPREVE CONTABILIDADE LTDA', {
      x: finalX + 12,
      y: adjustedY + sealHeight - 28,
      size: 8.5,
      font,
      color: rgb(0, 0, 0),
    });

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
    const pdfWithPlaceholder = await plainAddPlaceholder({
      pdfBuffer: pdfBufferNormalized,
      reason: 'Assinatura Digital Audipreve',
      signatureLength: 8192,
    });

    const pfxBuffer = Buffer.from(cleanBase64(pfxBase64), 'base64');
    const signer = new P12Signer(pfxBuffer, { passphrase });
    const signedPdfBuffer = await new SignPdf().sign(pdfWithPlaceholder, signer);

    return res.status(200).json({
      success: true,
      signedPdfBase64: signedPdfBuffer.toString('base64'),
    });
  } catch (error) {
    console.error('[API Sign] Erro crítico:', error);
    return res.status(500).json({
      error: 'Falha na assinatura digital',
    });
  }
}
