const fs = require('fs');
const path = require('path');
const targetClasses = 'space-y-6 animate-fade-in relative pb-10';

const logs = [
  { "modulo": "DashboardPage.tsx", "atual": "space-y-8 pb-10 animate-fade-in relative", "status": "DIFF" },
  { "modulo": "IRPFPage.tsx", "atual": "space-y-6 animate-fade-in pb-10", "status": "DIFF" },
  { "modulo": "OcorrenciasPage.tsx", "atual": "space-y-6 animate-fade-in relative pb-10", "status": "OK" },
  { "modulo": "RecalculosPage.tsx", "atual": "flex items-center gap-3", "status": "DIFF" },
  { "modulo": "RecibosPage.tsx", "atual": "space-y-4 animate-fade-in pb-10 relative px-0.5", "status": "DIFF" },
  { "modulo": "RelatorioPersonalizadoPage.tsx", "atual": "p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4", "status": "DIFF" },
  { "modulo": "TarefasPage.tsx", "atual": "w-1.5 h-1.5 rounded-full bg-white", "status": "DIFF" },
  { "modulo": "ContabilPage.tsx", "atual": "flex items-center gap-3", "status": "DIFF" },
  { "modulo": "FiscalPage.tsx", "atual": "flex items-center gap-3", "status": "DIFF" },
  { "modulo": "PessoalPage.tsx", "atual": "flex items-center gap-3", "status": "DIFF" },
  { "modulo": "SocietarioPage.tsx", "atual": "space-y-4 animate-fade-in pb-10 relative px-0.5", "status": "DIFF" },
  { "modulo": "CertidoesPage.tsx", "atual": "flex items-center gap-3", "status": "DIFF" },
  { "modulo": "CertificadosPage.tsx", "atual": "flex items-center gap-4", "status": "DIFF" },
  { "modulo": "DeclaracoesAnuaisPage.tsx", "atual": "flex items-center gap-4", "status": "DIFF" },
  { "modulo": "DeclaracoesMensaisPage.tsx", "atual": "flex items-center gap-4", "status": "DIFF" },
  { "modulo": "FaturamentoPage.tsx", "atual": "space-y-6 animate-fade-in pb-10 relative px-0.5", "status": "DIFF" },
  { "modulo": "GerenciadorArquivosPage.tsx", "atual": "flex items-center gap-2 min-w-0", "status": "DIFF" },
  { "modulo": "LicencasPage.tsx", "atual": "flex items-center justify-between gap-4 border-b border-border/40 pb-5", "status": "DIFF" },
  { "modulo": "ParcelamentosPage.tsx", "atual": "flex items-center gap-5", "status": "DIFF" },
  { "modulo": "ProcuracoesPage.tsx", "atual": "flex items-center gap-5", "status": "DIFF" },
  { "modulo": "SimuladorCalculosPage.tsx", "atual": "space-y-6 animate-fade-in pb-10", "status": "DIFF" },
  { "modulo": "AuditoriaPage.tsx", "atual": "space-y-6", "status": "DIFF" },
  { "modulo": "ConfiguracoesPage.tsx", "atual": "w-2 h-2 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/40", "status": "DIFF" },
  { "modulo": "GestorAlertasPage.tsx", "atual": "space-y-8 pb-10", "status": "DIFF" }
];

logs.forEach(log => {
  if (log.status !== 'DIFF') return;
  const file = path.join('src/pages', log.modulo);
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      let rIndex = content.lastIndexOf('return (');
      if (rIndex > -1) {
          let before = content.substring(0, rIndex);
          let after = content.substring(rIndex);
          // Substitui o targetClasses de volta para o atual
          after = after.replace('<div className="' + targetClasses + '"', '<div className="' + log.atual + '"');
          fs.writeFileSync(file, before + after, 'utf8');
      }
  }
});
console.log('REVERT DONE');
