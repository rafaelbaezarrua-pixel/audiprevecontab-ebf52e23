import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { 
  MODULES_CONFIG, SITUATIONS, COMPANY_FIELDS, 
  ModuleConfig, HeaderConfig, licencaLabels, safeFormatDate 
} from "@/constants/reports";
import { formatMonthYearBR, formatDateBR } from "@/lib/utils";
import { generatePDFHeader, applyAutoTable } from "@/lib/pdf-generator";
import { tipoProcessoLabels } from "@/constants/societario";

export function useReportGenerator() {
  const [loadingType, setLoadingType] = useState<'pdf' | 'excel' | null>(null);

  const fetchVencimentos = async (fieldsToInclude: string[]) => {
    const calcStatus = (data: string) => {
      const dias = Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
      return dias < 0 ? "Vencido" : dias <= 30 ? "Próximo" : "Em Dia";
    };

    const licMap: Record<string, string> = { alvara: "licenca_alvara", vigilancia_sanitaria: "licenca_vigilancia", corpo_bombeiros: "licenca_bombeiros", meio_ambiente: "licenca_meio_ambiente" };
    const taxaMap: Record<string, string> = { alvara: "taxa_alvara", vigilancia_sanitaria: "taxa_vigilancia", corpo_bombeiros: "taxa_bombeiros", meio_ambiente: "taxa_meio_ambiente" };

    const [{ data: licData }, { data: certData }, { data: procData }, { data: certidoesData }, { data: taxasData }] = await Promise.all([
      fieldsToInclude.some(f => f.startsWith("licenca_")) ? supabase.from("licencas").select("*").eq("status", "com_vencimento").not("vencimento", "is", null) : Promise.resolve({ data: [] }),
      fieldsToInclude.includes("certificados") ? supabase.from("certificados_digitais").select("*").not("data_vencimento", "is", null) : Promise.resolve({ data: [] }),
      fieldsToInclude.includes("procuracoes") ? supabase.from("procuracoes").select("*").not("data_vencimento", "is", null) : Promise.resolve({ data: [] }),
      fieldsToInclude.includes("certidoes") ? supabase.from("certidoes").select("*").not("vencimento", "is", null) : Promise.resolve({ data: [] }),
      fieldsToInclude.some(f => f.startsWith("taxa_")) ? (supabase.from("licencas_taxas" as any).select("*").not("data_vencimento", "is", null) as any) : Promise.resolve({ data: [] }),
    ]);

    const compiled: any[] = [];
    licData?.forEach((l: any) => {
      if (fieldsToInclude.includes(licMap[l.tipo_licenca])) {
        compiled.push({ empresa_id: l.empresa_id, tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`, data: l.vencimento, status: calcStatus(l.vencimento) });
      }
    });

    if (fieldsToInclude.includes("certificados")) {
      certData?.forEach((c: any) => compiled.push({ empresa_id: c.empresa_id, tipo: "Certificado Digital", data: c.data_vencimento, status: calcStatus(c.data_vencimento) }));
    }
    if (fieldsToInclude.includes("procuracoes")) {
      procData?.forEach((p: any) => compiled.push({ empresa_id: p.empresa_id, tipo: "Procuração", data: p.data_vencimento, status: calcStatus(p.data_vencimento) }));
    }
    if (fieldsToInclude.includes("certidoes")) {
      certidoesData?.forEach((c: any) => compiled.push({ empresa_id: c.empresa_id, tipo: `Certidão: ${c.tipo_certidao}`, data: c.vencimento, status: calcStatus(c.vencimento) }));
    }
    taxasData?.forEach((t: any) => {
      if (fieldsToInclude.includes(taxaMap[t.tipo_licenca])) {
        compiled.push({ empresa_id: t.empresa_id, tipo: `Taxa: ${licencaLabels[t.tipo_licenca] || t.tipo_licenca}`, data: t.data_vencimento, status: calcStatus(t.data_vencimento), status_taxa: t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : "Pendente", data_envio: safeFormatDate(t.data_envio), forma_envio: t.forma_envio || "—" });
      }
    });
    return compiled;
  };

  const fetchIRPF = async (competencia: string) => {
    const ano = competencia.split('-')[0];
    const { data: irpfClientes } = await (supabase.from("controle_irpf" as any).select("*").eq("ano_exercicio", ano) as any);
    const { data: irpfSocios } = await supabase.from("declaracoes_irpf" as any).select(`*, socios(id, nome, cpf, empresa_id, empresas(nome_empresa))`).eq("ano", ano);
    const { data: allAdmins } = await supabase.from("socios").select(`id, nome, cpf, empresa_id, empresas(nome_empresa)`).eq("administrador", true);

    const unified: any[] = [];
    if (irpfClientes) {
      (irpfClientes as any[]).forEach(c => unified.push({ categoria: "IRPF Clientes", nome_completo: c.nome_completo, cpf: c.cpf, empresa: "—", ano_exercicio: c.ano_exercicio, valor_a_pagar: c.valor_a_pagar, status_pago: c.status_pago, data_pagamento: c.data_pagamento, status_transmissao: c.status_transmissao, data_transmissao: c.data_transmissao, feito_por: c.feito_por, forma_pagamento: c.forma_pagamento }));
    }

    // Map existing records
    const sociosWithRecords = new Set();
    if (irpfSocios) {
      (irpfSocios as any[]).forEach((s: any) => {
        sociosWithRecords.add(s.socio_id);
        unified.push({ 
          categoria: "IRPF Clientes Empresa", 
          nome_completo: s.socios?.nome || "—", 
          cpf: s.socios?.cpf || "—", 
          empresa: s.socios?.empresas?.nome_empresa || "—", 
          ano_exercicio: s.ano, 
          valor_a_pagar: null, 
          status_pago: null, 
          data_pagamento: null, 
          faz_pelo_escritorio: s.faz_pelo_escritorio,
          situacao: s.situacao,
          transmitida: s.transmitida,
          status_transmissao: s.situacao === 'finalizada' ? "transmitida" : s.situacao || "pendente", 
          data_transmissao: s.data_transmissao, 
          quem_transmitiu: s.quem_transmitiu,
          feito_por: s.quem_transmitiu 
        });
      });
    }

    // Add administrators without records
    if (allAdmins) {
      (allAdmins as any[]).forEach((adm: any) => {
        if (!sociosWithRecords.has(adm.id)) {
          unified.push({ 
            categoria: "IRPF Clientes Empresa", 
            nome_completo: adm.nome || "—", 
            cpf: adm.cpf || "—", 
            empresa: adm.empresas?.nome_empresa || "—", 
            ano_exercicio: ano, 
            valor_a_pagar: null, 
            status_pago: null, 
            data_pagamento: null, 
            faz_pelo_escritorio: false,
            situacao: 'pendente',
            transmitida: false,
            status_transmissao: "pendente", 
            data_transmissao: null, 
            quem_transmitiu: null,
            feito_por: null 
          });
        }
      });
    }
    return unified;
  };

  const generateReport = async (
    competencia: string,
    selectedModules: string[],
    selectedFields: Record<string, string[]>,
    selectedCompanyFields: string[],
    selectedSituations: string[],
    headerConfig?: HeaderConfig,
    format: 'pdf' | 'excel' = 'pdf',
    moduleFilters: Record<string, string[]> = {}
  ) => {
    setLoadingType(format);
    try {
      // 1. Fetch Companies
      const isMeiSelected = selectedSituations.includes("mei");
      const situacoesWithoutMei = selectedSituations.filter(s => s !== "mei");
      let query = supabase.from("empresas").select("*").order("nome_empresa");
      if (isMeiSelected) {
        if (situacoesWithoutMei.length > 0) {
          const situacaoEqs = situacoesWithoutMei.map(s => `situacao.eq.${s.toLowerCase()}`).join(',');
          query = query.or(`${situacaoEqs},regime_tributario.eq.mei`);
        } else query = query.or("regime_tributario.eq.mei");
      } else query = query.in("situacao", situacoesWithoutMei.map(s => s.toLowerCase()) as any);

      const { data: allCompanies, error: companiesError } = await query;
      if (companiesError) throw companiesError;

      // 2. Doc Init
      let doc: jsPDF | null = null;
      let currentY = 60;
      const excelAoA: any[][] = [];
      if (format === 'pdf') {
        doc = new jsPDF({ orientation: 'landscape' });
        await generatePDFHeader(doc, headerConfig);
        doc.setFontSize(14);
        doc.setFont("Ubuntu", "bold");
        doc.text(`RELATÓRIO PERSONALIZADO - ${formatMonthYearBR(competencia)}`, doc.internal.pageSize.getWidth() / 2, 50, { align: "center" });
      }

      // 3. Modules Loop
      for (const modId of selectedModules) {
        const mod = MODULES_CONFIG.find(m => m.id === modId)!;
        const fieldsToInclude = selectedFields[modId] || [];
        if (fieldsToInclude.length === 0) continue;

        let moduleData: any[] = [];
        if (modId === "societario") moduleData = allCompanies;
        else if (modId === "vencimentos") moduleData = await fetchVencimentos(fieldsToInclude);
        else if (modId === "irpf") moduleData = await fetchIRPF(competencia);
        else if (modId === "tarefas") {
          const { data: usersData } = await supabase.from("profiles").select("id, full_name, user_id").eq("ativo", true);
          const mappedUsers = (usersData || []).filter((u: any) => u.user_id).map((u: any) => ({
            id: u.user_id,
            nome: u.full_name || "Sem Nome"
          }));
          const { data } = await supabase.from("tarefas" as any).select("*, empresas(nome_empresa)").eq("competencia", competencia);
          moduleData = (data || []).map((t: any) => ({
            ...t,
            usuario_nome: mappedUsers.find(u => u.id === t.usuario_id)?.nome || "Não encontrado"
          }));
        }
        else if (modId === "faturamentos") {
          const { data: indData } = await supabase.from("faturamentos" as any).select("*").eq("competencia", competencia);
          const { data: relData } = await supabase.from("relacao_faturamentos" as any).select("*"); 
          // Note: for Relacao, we might want to filter by periodo? But relData is usually less records, so we can filter in JS
          
          const mappedInd = (indData || []).map((d: any) => ({ ...d, tipo_descricao: "Faturamento Emitido" }));
          const mappedRel = (relData || []).filter((r: any) => 
            r.periodo_fim === competencia || r.periodo_inicio === competencia 
          ).map((r: any) => ({ 
            ...r, 
            tipo_descricao: "Relação de Faturamento Real", 
            nome_cliente: r.nome_empresa, 
            valor: r.valor_total,
            competencia: r.periodo_fim
          }));
          
          moduleData = [...mappedInd, ...mappedRel];
        }
        else if (modId === "declaracoes_anuais") {
          const ano = competencia.split('-')[0];
          const selectedTypes = moduleFilters[modId] || [];
          let combinedData: any[] = [];
          
          // 1. Outras Declarações (DEFIS, ECD, etc)
          if (selectedTypes.length === 0 || selectedTypes.some(t => t !== "IRPF")) {
            let q = supabase.from("declaracoes_anuais").select("*").eq("ano", parseInt(ano));
            if (selectedTypes.length > 0) {
              q = q.in("tipo_declaracao", selectedTypes.filter(t => t !== "IRPF"));
            }
            const { data } = await q;
            if (data) combinedData = [...combinedData, ...data];
          }
          
          // 2. IRPF de Sócios (específico)
          if (selectedTypes.length === 0 || selectedTypes.includes("IRPF")) {
            const { data: irpf } = await supabase.from("declaracoes_irpf" as any).select(`
              *,
              socios(id, nome, empresa_id)
            `).eq("ano", parseInt(ano));
            
            const companyIds = allCompanies.map(c => c.id);
            const { data: admins } = await supabase.from("socios").select("id, nome, empresa_id").in("empresa_id", companyIds).eq("administrador", true);
            
            const sociosWithRecords = new Set();
            if (irpf) {
              const mapped = (irpf as any[]).map(i => {
                sociosWithRecords.add(i.socio_id);
                return {
                  ...i,
                  tipo_declaracao: "IRPF",
                  empresa_id: i.socios?.empresa_id,
                  socio_nome: i.socios?.nome
                };
              });
              combinedData = [...combinedData, ...mapped];
            }

            // Add missing administrators
            if (admins) {
              const virtualRecords = (admins as any[])
                .filter(a => !sociosWithRecords.has(a.id))
                .map(a => ({
                  tipo_declaracao: "IRPF",
                  empresa_id: a.empresa_id,
                  socio_nome: a.nome,
                  ano: parseInt(ano),
                  situacao: 'pendente',
                  transmitida: false,
                  faz_pelo_escritorio: false
                }));
              combinedData = [...combinedData, ...virtualRecords];
            }
          }
          moduleData = combinedData;
        }
        else {
          let mQuery = supabase.from(mod.table as any).select("*");
          if (["fiscal", "pessoal", "declaracoes_mensais", "honorarios", "recalculos", "licencas_taxas", "agendamentos", "servicos_esporadicos", "recibos"].includes(modId)) {
            mQuery = mQuery.eq("competencia", competencia);
          }

          // Aplicar filtros específicos do módulo (ex: tipo de declaração)
          if (mod.filterField && moduleFilters[modId]) {
            mQuery = mQuery.in(mod.filterField, moduleFilters[modId]);
          }

          const { data } = await mQuery;
          moduleData = data || [];
        }

        // IRPF Special Handling
        if (modId === "irpf") {
          const categorias = ["IRPF Clientes", "IRPF Clientes Empresa"];
          for (const cat of categorias) {
            const catData = moduleData.filter(d => d.categoria === cat);
            if (catData.length === 0) continue;
            const activeFields = mod.fields.filter(f => fieldsToInclude.includes(f.id));
            const head = [activeFields.map(f => f.label)];
            const body = catData.map(item => activeFields.map(f => f.accessor ? f.accessor(item) : (item[f.id] ?? "—")));

            if (format === 'pdf' && doc) {
              currentY = applyAutoTable(doc, head, body, currentY, `${cat.toUpperCase()} (${competencia.split('-')[0]})`);
            } else if (format === 'excel') {
              excelAoA.push([], [`--- IRPF: ${cat.toUpperCase()} ---`], head[0], ...body);
            }
          }
          continue;
        }

        // Processos orphaned / Avulsos / Standalone Modules
        if (["processos_societarios", "recibos"].includes(modId)) {
          const orphaned = moduleData.filter(d => !d.empresa_id);
          if (orphaned.length > 0) {
            const activeFields = mod.fields.filter(f => fieldsToInclude.includes(f.id));
            let title = "AVULSOS";
            if (modId === "processos_societarios") title = "PROCESSOS SEM EMPRESA VINCULADA";
            else if (modId === "recibos") title = "RECIBOS AVULSOS (TOTALMENTE AVULSOS)";

            const head = [["Referência/Cliente", ...activeFields.map(f => f.label)]];
            const body = orphaned.map(p => [p.nome_empresa || p.nome_cliente || "—", ...activeFields.map(f => f.accessor ? f.accessor(p) : (p[f.id] ?? "—"))]);
            
            if (format === 'pdf' && doc) currentY = applyAutoTable(doc, head, body, currentY, title);
            else if (format === 'excel') excelAoA.push([], [`--- ${title} ---`], head[0], ...body);
          }
          
          // Se forem módulos totalmente avulsos, não processar o loop de empresas abaixo
          if (modId === "recibos") continue;
        }

        // Situation Grouping
        for (const sit of SITUATIONS) {
          if (!selectedSituations.includes(sit.id.toLowerCase())) continue;
          const situationCompanies = allCompanies.filter(c => {
            const isMei = c.regime_tributario?.toLowerCase() === "mei";
            if (sit.id.toLowerCase() === "mei") return isMei;
            return c.situacao?.toLowerCase() === sit.id.toLowerCase() && !isMei;
          });
          if (situationCompanies.length === 0) continue;

          const activeFields = mod.id === "vencimentos" 
             ? [{id:"tipo", label:"Item"}, {id:"status", label:"Situação"}, {id:"data", label:"Vencimento", accessor:(i:any)=>safeFormatDate(i.data)}, ...(fieldsToInclude.some(f=>f.startsWith("taxa_")) ? [{id:"status_taxa", label:"Status Taxa"}, {id:"data_envio", label:"Data Env."}, {id:"forma_envio", label:"Forma Env."}] : [])]
             : mod.fields.filter(f => fieldsToInclude.includes(f.id));
          
          const extraHeaders = COMPANY_FIELDS.filter(f => selectedCompanyFields.includes(f.id));
          const head = [["Empresa", ...extraHeaders.map(f => f.label), ...activeFields.map(f => f.label)]];
          
          const body: any[] = [];
          situationCompanies.forEach(company => {
            let companyRecords = [];
            if (modId === "societario") {
              companyRecords = moduleData.filter(d => d.id === company.id);
            } else if (modId === "faturamentos") {
              // Faturamento vincula por ID (Relação) ou Nome (Individual)
              companyRecords = moduleData.filter(d => 
                d.empresa_id === company.id || 
                (d.nome_cliente && d.nome_cliente.toLowerCase() === company.nome_empresa.toLowerCase())
              );
            } else {
              companyRecords = moduleData.filter(d => d.empresa_id === company.id);
            }
            const compValues = extraHeaders.map(f => f.accessor ? f.accessor(company) : (company[f.id] ?? "—"));
            if (companyRecords.length > 0) {
              companyRecords.forEach(r => body.push([company.nome_empresa, ...compValues, ...activeFields.map(f => f.accessor ? f.accessor(r) : (r[f.id] ?? "—"))]));
            } else if (modId !== "faturamentos") {
              // Para faturamento, não mostrar empresas sem movimento. Para os outros, mostrar com traços.
              body.push([company.nome_empresa, ...compValues, ...activeFields.map(() => "—")]);
            }
          });

          if (format === 'pdf' && doc) currentY = applyAutoTable(doc, head, body, currentY, `MÓDULO: ${mod.label} | SITUAÇÃO: ${sit.label}`);
          else if (format === 'excel') excelAoA.push([], [`--- ${mod.label} | ${sit.label} ---`], head[0], ...body);
        }
      }

      // 4. Save
      if (format === 'pdf' && doc) doc.save(`Relatorio_${formatMonthYearBR(competencia).replace('/', '-')}.pdf`);
      else if (format === 'excel') {
        const ws = XLSX.utils.aoa_to_sheet(excelAoA);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
        XLSX.writeFile(wb, `Relatorio_${formatMonthYearBR(competencia).replace('/', '-')}.xlsx`);
      }
      toast.success("Relatório gerado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoadingType(null);
    }
  };

  return { loadingType, generateReport };
}
