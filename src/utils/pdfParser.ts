import * as pdfjs from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface ExtractedTaxData {
  cnpj: string | null;
  competencia: string | null;
  tipo: string | null;
  valor: number | null;
  fileName: string;
}

/**
 * Extrai texto e dados básicos de um PDF de guia fiscal (ex: e-CAC).
 */
export async function extractTaxGuideData(file: File): Promise<ExtractedTaxData> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    
    // Extrai texto de todas as páginas (geralmente guias e-CAC têm 1 ou 2 páginas)
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    // Padrões de Regex para guias brasileiras (e-CAC / DAS / GPS)
    
    // 1. CNPJ: XX.XXX.XXX/XXXX-XX
    const cnpjMatch = fullText.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    
    // 2. Competência: MM/AAAA
    // Tentamos encontrar padrões que se assemelham a competência
    const compMatch = fullText.match(/(?:Competência|Período de Apuração|PA):\s*(\d{2}\/\d{4})/) || 
                      fullText.match(/(\d{2}\/\d{4})/);

    // 3. Valor (Opcional, mas útil): Procura por "Valor Total" ou similares
    const valorMatch = fullText.match(/(?:Valor Total|Total a Pagar|TOTAL DA GUIA|Soma):\s*([\d\.,]+)/i);
    
    // 4. Tipo de Guia (Heurística básica)
    let tipo = "Desconhecido";
    if (fullText.includes("SIMPLES NACIONAL") || fullText.includes("DAS")) tipo = "Simples Nacional (DAS)";
    else if (fullText.includes("FGTS")) tipo = "FGTS";
    else if (fullText.includes("INSS") || fullText.includes("Previdência Social")) tipo = "INSS (GPS)";
    else if (fullText.includes("IRPJ")) tipo = "IRPJ";
    else if (fullText.includes("ISS")) tipo = "ISS";

    return {
      cnpj: cnpjMatch ? cnpjMatch[0] : null,
      competencia: compMatch ? (compMatch[1] || compMatch[0]) : null,
      tipo,
      valor: valorMatch ? parsePortugueseNumber(valorMatch[1]) : null,
      fileName: file.name
    };
  } catch (error) {
    console.error("Erro ao processar PDF:", error);
    throw new Error("Não foi possível ler o arquivo PDF.");
  }
}

function parsePortugueseNumber(val: string): number | null {
  // Converte "1.234,56" para 1234.56
  const clean = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}
