const fs = require('fs');
const path = require('path');

const targetOuter = 'space-y-6 animate-fade-in relative pb-10';

const pages = [
  'DashboardPage.tsx', 'IRPFPage.tsx', 'OcorrenciasPage.tsx', 'RecalculosPage.tsx',
  'RecibosPage.tsx', 'RelatorioPersonalizadoPage.tsx', 'TarefasPage.tsx',
  'ContabilPage.tsx', 'FiscalPage.tsx', 'FinanceiroPage.tsx', 'PessoalPage.tsx',
  'SocietarioPage.tsx', 'AssinaturasPage.tsx', 'CertidoesPage.tsx',
  'CertificadosPage.tsx', 'DeclaracoesAnuaisPage.tsx', 'DeclaracoesMensaisPage.tsx',
  'FaturamentoPage.tsx', 'GerenciadorArquivosPage.tsx', 'LicencasPage.tsx',
  'ParcelamentosPage.tsx', 'ProcuracoesPage.tsx', 'SimuladorCalculosPage.tsx',
  'VencimentosPage.tsx', 'AuditoriaPage.tsx', 'ConfiguracoesPage.tsx',
  'GestorAlertasPage.tsx', 'AgendamentosPage.tsx'
];

let tableRows = [];
let doneList = [];

pages.forEach(p => {
  const file = path.join('src/pages', p);
  if (!fs.existsSync(file)) {
    tableRows.push(`| ${p.replace('Page.tsx','')} | NOT FOUND | ❌ Diferente |`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  let rIndex = content.lastIndexOf('return (');
  if (rIndex === -1) rIndex = content.lastIndexOf('return(');
  if (rIndex > -1) {
    let before = content.substring(0, rIndex);
    let after = content.substring(rIndex);
    
    // Procura o outer wrapper (primeiro div)
    let outerMatch = after.match(/<div\s+className=['"`]([^'"`]+)['"`]/);
    if (!outerMatch) return;
    
    let outerClass = outerMatch[1];
    
    // Identifica espacamentos de topo se houver (mt-*, pt-*, space-y-* diferente)
    let topSpacing = [];
    let ptMatch = outerClass.match(/\b(pt-\d+|mt-\d+)\b/);
    if (ptMatch) topSpacing.push(ptMatch[1]);
    
    // Procura por mt-* no header section tbm (que o Dashboard as vezes usa)
    let innerHeaderMatch = after.match(/<div\s+className=['"`](flex\s+flex-col[^'"`]+)['"`]/);
    if (innerHeaderMatch) {
       let ptInner = innerHeaderMatch[1].match(/\b(pt-\d+|mt-\d+)\b/);
       if (ptInner) topSpacing.push(ptInner[1]);
    }
    
    let isOk = (outerClass === targetOuter) && topSpacing.length === 0;
    let actualRepr = topSpacing.length > 0 ? topSpacing.join(', ') : (outerClass === targetOuter ? 'vazio (ok)' : outerClass);
    
    if (p === 'AgendamentosPage.tsx') {
        tableRows.push(`| ${p.replace('Page.tsx','')} | ${actualRepr} | ✅ Referência |`);
        doneList.push(`□ ${p.replace('Page.tsx','')}`);
        return;
    }

    tableRows.push(`| ${p.replace('Page.tsx','')} | ${actualRepr} | ${isOk ? '✅ Igual' : '❌ Diferente'} |`);
    
    // Fix process
    // Troca o outer
    let newOuterClass = targetOuter;
    
    // Strip header pt/mt se tiver
    let newAfter = after.replace(/<div\s+className=['"`]([^'"`]+)['"`]/, `<div className="${newOuterClass}"`);
    
    if (innerHeaderMatch) {
        let cleanInner = innerHeaderMatch[1].replace(/\b(mt-\d+|pt-\d+)\b/g, '').replace(/\s+/g, ' ').trim();
        newAfter = newAfter.replace(innerHeaderMatch[1], cleanInner);
    }
    
    // write back explicitly
    fs.writeFileSync(file, before + newAfter, 'utf8');
    doneList.push(`□ ${p.replace('Page.tsx','')}`);
  }
});

fs.writeFileSync('diagnostic.txt', tableRows.join('\n') + '\n\n' + doneList.join('\n'));
console.log('DIAGNOSTIC & FIX COMPLETE');
