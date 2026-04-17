const fs = require('fs');
const path = require('path');

const pages = [
  'DashboardPage.tsx', 'IRPFPage.tsx', 'OcorrenciasPage.tsx', 'RecalculosPage.tsx',
  'RecibosPage.tsx', 'RelatorioPersonalizadoPage.tsx', 'TarefasPage.tsx',
  'ContabilPage.tsx', 'FiscalPage.tsx', 'FinanceiroPage.tsx', 'PessoalPage.tsx',
  'SocietarioPage.tsx', 'AssinaturasPage.tsx', 'CertidoesPage.tsx',
  'CertificadosPage.tsx', 'DeclaracoesAnuaisPage.tsx', 'DeclaracoesMensaisPage.tsx',
  'FaturamentoPage.tsx', 'GerenciadorArquivosPage.tsx', 'LicencasPage.tsx',
  'ParcelamentosPage.tsx', 'ProcuracoesPage.tsx', 'SimuladorCalculosPage.tsx',
  'VencimentosPage.tsx', 'AuditoriaPage.tsx', 'ConfiguracoesPage.tsx',
  'GestorAlertasPage.tsx'
];

let result = {};

pages.forEach(p => {
  const file = path.join('src/pages', p);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let regex = /const\s+[A-Za-z0-9_]+\s*(?::\s*React\.FC)?\s*=\s*(?:\([^)]*\))?\s*=>\s*{/;
  let componentMatch = regex.exec(content);
  if (componentMatch) {
      let afterDecl = content.substring(componentMatch.index);
      // We look for the FIRST return statement that actually wraps JSX (not early returns if possible)
      // Usually the main return is the one that has <div or <form right after.
      let retRegex = /return\s*\(\s*(?:<>\s*)?<div\s+className=['"`]([^'"`]+)['"`]/;
      let retMatch = retRegex.exec(afterDecl);
      if (retMatch) {
          result[p] = retMatch[1];
      }
  }
});

console.log(JSON.stringify(result, null, 2));
