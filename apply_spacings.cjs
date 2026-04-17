const fs = require('fs');
const path = require('path');

const targetWrapper = 'space-y-6 animate-fade-in relative pb-10';

const patches = {
  "DashboardPage.tsx": { outer: "space-y-8 pb-10 animate-fade-in relative", outerNew: targetWrapper, stripInner: true },
  "IRPFPage.tsx": { outer: "space-y-6 animate-fade-in pb-10", outerNew: targetWrapper },
  "RecalculosPage.tsx": { outer: "space-y-4 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "RecibosPage.tsx": { outer: "space-y-4 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "RelatorioPersonalizadoPage.tsx": { outer: "space-y-6 animate-fade-in pb-20", outerNew: targetWrapper },
  "TarefasPage.tsx": { outer: "space-y-8 animate-fade-in pb-20 relative px-1", outerNew: targetWrapper },
  "ContabilPage.tsx": { outer: "space-y-6", outerNew: targetWrapper },
  "FiscalPage.tsx": { outer: "space-y-4 animate-fade-in relative pb-10 px-1", outerNew: targetWrapper },
  "PessoalPage.tsx": { outer: "space-y-4 animate-fade-in relative pb-10 px-1", outerNew: targetWrapper },
  "SocietarioPage.tsx": { outer: "space-y-4 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "CertidoesPage.tsx": { outer: "space-y-6 animate-fade-in relative pb-10 px-0.5", outerNew: targetWrapper },
  "CertificadosPage.tsx": { outer: "space-y-6 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "DeclaracoesAnuaisPage.tsx": { outer: "space-y-6 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "FaturamentoPage.tsx": { outer: "space-y-6 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "GerenciadorArquivosPage.tsx": { outer: "space-y-6 animate-fade-in pb-10", outerNew: targetWrapper },
  "LicencasPage.tsx": { outer: "space-y-8 animate-fade-in pb-20 relative", outerNew: targetWrapper },
  "ParcelamentosPage.tsx": { outer: "space-y-8 animate-fade-in pb-20 relative", outerNew: targetWrapper },
  "ProcuracoesPage.tsx": { outer: "space-y-8 animate-fade-in pb-20 relative", outerNew: targetWrapper },
  "SimuladorCalculosPage.tsx": { outer: "space-y-6 animate-fade-in pb-10", outerNew: targetWrapper },
  "VencimentosPage.tsx": { outer: "space-y-6 animate-fade-in pb-10 relative px-0.5", outerNew: targetWrapper },
  "ConfiguracoesPage.tsx": { outer: "space-y-8 animate-fade-in pb-10", outerNew: targetWrapper },
  "GestorAlertasPage.tsx": { outer: "space-y-8 pb-10", outerNew: targetWrapper }
};

Object.keys(patches).forEach(p => {
  const file = path.join('src/pages', p);
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let config = patches[p];
  
  // Find the LAST return block containing this exact outer class
  // To avoid early returns with same wrappers matching 
  let lastIdx = content.lastIndexOf(`return (\n    <div className="${config.outer}">`);
  if (lastIdx === -1) lastIdx = content.lastIndexOf(`return (\n      <div className="${config.outer}">`);
  if (lastIdx === -1) lastIdx = content.lastIndexOf(`return (\n        <div className="${config.outer}">`);
  if (lastIdx === -1) lastIdx = content.lastIndexOf(`<div className="${config.outer}">`);
  
  if (lastIdx > -1) {
      let portion = content.substring(lastIdx, lastIdx + 500);
      let newPortion = portion.replace(`<div className="${config.outer}">`, `<div className="${config.outerNew}">`);
      
      // Strip inner mt/pt on the next child flex container (top bar)
      if (config.stripInner) {
          let innerRegex = /^(?:[\s\S]*?)<div\s+className=['"`](flex\s+flex-col[^'"`]+)['"`]/;
          let match = innerRegex.exec(newPortion);
          if (match) {
              let oldInner = match[1];
              let newInner = oldInner.replace(/\b(mt-\d+|pt-\d+)\b/g, '').replace(/\s+/g, ' ').trim();
              newPortion = newPortion.replace(oldInner, newInner);
          }
      }
      
      content = content.substring(0, lastIdx) + newPortion + content.substring(lastIdx + 500);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed', p);
  } else {
      console.log('NOT FOUND exact match for', p);
  }
});
