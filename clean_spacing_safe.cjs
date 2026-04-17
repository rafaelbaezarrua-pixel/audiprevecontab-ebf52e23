const fs = require('fs');
const path = require('path');
const targetOuter = 'space-y-6 animate-fade-in relative pb-10';

const pages = [
  'DashboardPage.tsx', 'IRPFPage.tsx', 'OcorrenciasPage.tsx', 'RecalculosPage.tsx',
  'RecibosPage.tsx', 'RelatorioPersonalizadoPage.tsx', 'TarefasPage.tsx',
  'ContabilPage.tsx', 'FiscalPage.tsx', ' FinanceiroPage.tsx', 'PessoalPage.tsx',
  'SocietarioPage.tsx', 'CertidoesPage.tsx', 'CertificadosPage.tsx',
  'DeclaracoesAnuaisPage.tsx', 'DeclaracoesMensaisPage.tsx', 'FaturamentoPage.tsx',
  'GerenciadorArquivosPage.tsx', 'LicencasPage.tsx', 'ParcelamentosPage.tsx',
  'ProcuracoesPage.tsx', 'SimuladorCalculosPage.tsx', 'VencimentosPage.tsx',
  'AuditoriaPage.tsx', 'ConfiguracoesPage.tsx', 'GestorAlertasPage.tsx'
];

pages.forEach(p => {
  const file = path.join('src/pages', p);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let regex = /return\s*\(\s*(?:<>\s*)?<div\s+className=['"`]([^'"`]+)['"`]/g;
  let match;
  let matches = [];
  while ((match = regex.exec(content)) !== null) {
      matches.push(match);
  }
  
  if (matches.length > 0) {
      // Pick the last return block which is usually the main component render
      // (early returns are usually for loading states)
      let targetMatch = matches[matches.length - 1];
      let fullMatch = targetMatch[0];
      let oldClass = targetMatch[1];
      
      let topSpacingMatch = oldClass.match(/\b(pt-\d+|mt-\d+|space-y-\d+)\b/g);
      
      // Update
      let newClass = targetOuter;
      let newFull = fullMatch.replace(oldClass, newClass);
      
      // Also clean up immediate children with mt-/pt-
      // We will just do a simple string replace for the class
      let before = content.substring(0, targetMatch.index);
      let after = content.substring(targetMatch.index);
      
      // Replace outer class
      after = after.replace(fullMatch, newFull);
      
      // Find inner header
      let innerRegex = /^(?:[\s\S]*?)<div\s+className=['"`](flex\s+flex-col[^'"`]+)['"`]/;
      let innerMatch = innerRegex.exec(after.substring(0, 500));
      if (innerMatch) {
          let innerOld = innerMatch[1];
          let innerNew = innerOld.replace(/\b(mt-\d+|pt-\d+)\b/g, '').replace(/\s+/g, ' ').trim();
          if (innerOld !== innerNew) {
              after = after.replace(innerOld, innerNew);
          }
      }
      
      fs.writeFileSync(file, before + after, 'utf8');
      console.log('Fixed:', p);
  }
});
