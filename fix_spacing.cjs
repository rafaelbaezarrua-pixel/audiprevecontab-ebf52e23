const fs = require('fs');
const path = require('path');
const targetClasses = 'space-y-6 animate-fade-in relative pb-10';

const pagesToFix = [
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

const results = [];

pagesToFix.forEach(f => {
  const file = path.join('src/pages', f);
  if (!fs.existsSync(file)) {
      results.push({ modulo: f, atual: "NOT FOUND", status: "NOT FOUND" });
      return;
  }
  let content = fs.readFileSync(file, 'utf8');
  let rIndex = content.lastIndexOf('return (');
  if (rIndex > -1) {
    let before = content.substring(0, rIndex);
    let after = content.substring(rIndex);
    let match = after.match(/<div\s+className=['"`]([^'"`]+)['"`]/);
    if (match) {
        let cls = match[1];
        let status = cls === targetClasses ? "OK" : "DIFF";
        results.push({ modulo: f, atual: cls, status: status });
        
        // Replacement for normalization (CASO B)
        after = after.replace(/<div\s+className=['"`][^'"`]+['"`]/, '<div className="' + targetClasses + '"');
        fs.writeFileSync(file, before + after, 'utf8');
    } else {
        results.push({ modulo: f, atual: "NO MATCH STR", status: "NO MATCH" });
    }
  } else {
    results.push({ modulo: f, atual: "NO RETURN", status: "NO MATCH" });
  }
});

console.log(JSON.stringify(results, null, 2));
