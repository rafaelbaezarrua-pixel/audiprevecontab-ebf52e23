import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Download, Calendar, DollarSign, 
  Shield, ClipboardList, AlertCircle, Building2,
  Users, CheckCircle, Circle, Save, Search, MoveHorizontal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoCaduceu from "@/assets/logo-caduceu.png";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";

interface HeaderConfig {
    logoUrl: string;
    title: string;
    subtitle: string;
    address: string;
    contact: string;
    titleFontSize: number;
    subtitleFontSize: number;
    infoFontSize: number;
    logoWidth: number;
    logoHeight: number;
    logoX: number;
    logoY: number;
}

const DEFAULT_HEADER: HeaderConfig = {
    logoUrl: "",
    title: "Audipreve Contabilidade",
    subtitle: "CRC-PR nº. 01.0093/O - 6",
    address: "Rua Jequitibá, n.º 789, 1º andar, sala 01, Bairro Nações, CEP 83823-004,",
    contact: "Fazenda Rio Grande/PR. Fone: (41) 3604-8059 | E-mail: societario@audiprevecontabilidade.com.br",
    titleFontSize: 22,
    subtitleFontSize: 10,
    infoFontSize: 8,
    logoWidth: 20,
    logoHeight: 20,
    logoX: 20,
    logoY: 10
};

const SITUATIONS = [
  { id: "ativa", label: "Ativas" },
  { id: "mei", label: "MEI" },
  { id: "paralisada", label: "Paralisadas" },
  { id: "baixada", label: "Baixadas" },
  { id: "entregue", label: "Entregues" }
];

const RelatoriosPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);
  const [selectedSituations, setSelectedSituations] = useState<string[]>(["ativa", "mei", "paralisada", "baixada", "entregue"]);
  const navigate = useNavigate();
  
  // Data States
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [pessoal, setPessoal] = useState<any[]>([]);
  const [fiscal, setFiscal] = useState<any[]>([]);
  const [vencimentos, setVencimentos] = useState<{empresa: string; tipo: string; data: string; status: string}[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);

  useEffect(() => {
    fetchHeaderConfig();
    fetchReportData();
  }, [competencia, selectedSituations]);

  const toggleSituation = (id: string) => {
    if (selectedSituations.includes(id)) {
      if (selectedSituations.length > 1) {
        setSelectedSituations(prev => prev.filter(s => s !== id));
      } else {
        toast.error("Selecione pelo menos uma situação");
      }
    } else {
      setSelectedSituations(prev => [...prev, id]);
    }
  };

  const fetchHeaderConfig = async () => {
    const { data } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();
    if (data?.value) {
      try {
        setHeaderConfig(JSON.parse(data.value));
      } catch (e) {
        console.error("Erro ao carregar config de cabeçalho", e);
      }
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Financeiro (Honorários + IRPF via servicos_esporadicos)
      const { data: honData, error: honError } = await supabase
        .from("honorarios_mensal") // Fixed table name: honorarios_mensal
        .select("*, empresas(nome_empresa)")
        .eq("competencia", competencia);
      
      if (honError) console.error("Erro honorarios:", honError);
        
      const { data: espData } = await (supabase
        .from("servicos_esporadicos" as any)
        .select("*")
        .eq("competencia", competencia) as any);

      // 2. Departamento Pessoal
      const { data: pesData } = await supabase
        .from("pessoal")
        .select("*, empresas(nome_empresa)")
        .eq("competencia", competencia);

      // 3. Fiscal
      const { data: fisData } = await supabase
        .from("fiscal")
        .select("*, empresas(nome_empresa)")
        .eq("competencia", competencia);

      const licencaLabels: Record<string, string> = { alvara: "Alvará", vigilancia_sanitaria: "Vigilância Sanitária", corpo_bombeiros: "Corpo de Bombeiros", meio_ambiente: "Meio Ambiente" };
      const calcStatus = (data: string) => { const dias = Math.ceil((new Date(data).getTime() - Date.now()) / 86400000); return dias < 0 ? "Vencido" : dias <= 30 ? "Próximo" : "Em Dia"; };

      const vencList: {empresa: string; tipo: string; data: string; status: string}[] = [];

      const [{ data: licData }, { data: certData }, { data: procData }, { data: certidoesData }, { data: taxasData }] = await Promise.all([
        supabase.from("licencas").select("*, empresas(nome_empresa)").eq("status", "com_vencimento").not("vencimento", "is", null),
        supabase.from("certificados_digitais").select("*, empresas(nome_empresa)").not("data_vencimento", "is", null),
        supabase.from("procuracoes").select("*, empresas(nome_empresa)").not("data_vencimento", "is", null),
        supabase.from("certidoes").select("*, empresas(nome_empresa)").not("vencimento", "is", null),
        (supabase.from("licencas_taxas" as any).select("*, empresas(nome_empresa)").not("data_vencimento", "is", null) as any),
      ]);

      licData?.forEach((l: any) => vencList.push({ empresa: l.empresas?.nome_empresa || "—", tipo: `Licença: ${licencaLabels[l.tipo_licenca] || l.tipo_licenca}`, data: l.vencimento, status: calcStatus(l.vencimento) }));
      certData?.forEach((c: any) => vencList.push({ empresa: c.empresas?.nome_empresa || "—", tipo: "Certificado Digital", data: c.data_vencimento, status: calcStatus(c.data_vencimento) }));
      procData?.forEach((p: any) => vencList.push({ empresa: p.empresas?.nome_empresa || "—", tipo: "Procuração", data: p.data_vencimento, status: calcStatus(p.data_vencimento) }));
      certidoesData?.forEach((c: any) => vencList.push({ empresa: c.empresas?.nome_empresa || "—", tipo: `Certidão: ${c.tipo_certidao}`, data: c.vencimento, status: calcStatus(c.vencimento) }));
      taxasData?.forEach((t: any) => vencList.push({ empresa: t.empresas?.nome_empresa || "—", tipo: `Taxa: ${licencaLabels[t.tipo_licenca] || t.tipo_licenca}`, data: t.data_vencimento, status: calcStatus(t.data_vencimento) }));
      vencList.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      // 5. Ocorrências (still filtered by selected month)
      const currentMonthStart = `${competencia}-01`;
      const nextMonth = new Date(competencia + "-01");
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const currentMonthEnd = nextMonth.toISOString().split('T')[0];

      const { data: ocData } = await supabase
        .from("ocorrencias")
        .select("*, empresas(nome_empresa)")
        .gte("data_ocorrencia", currentMonthStart)
        .lte("data_ocorrencia", currentMonthEnd);

      // 6. Fetch All Companies (Filtered by Situation)
      const situacoesWithoutMei = selectedSituations.filter(s => s !== "mei");
      let compQuery = supabase
        .from("empresas")
        .select("*")
        .order("nome_empresa");

      if (selectedSituations.includes("mei")) {
        if (situacoesWithoutMei.length > 0) {
          compQuery = compQuery.or(`situacao.in.(${situacoesWithoutMei.join(",")}),regime_tributario.eq.mei`);
        } else {
          compQuery = compQuery.eq("regime_tributario", "mei");
        }
      } else {
        compQuery = compQuery.in("situacao", situacoesWithoutMei as any);
      }

      const { data: companiesData } = await compQuery;

      setAllCompanies(companiesData || []);
      setFinanceiro([...(honData || []), ...(espData || [])]);
      setPessoal(pesData || []);
      setFiscal(fisData || []);
      setVencimentos(vencList);
      setOcorrencias(ocData || []);

    } catch (error) {
      console.error("Erro ao buscar dados do relatório:", error);
      toast.error("Erro ao carregar dados dos relatórios. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFHeader = async (doc: jsPDF) => {
    doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
    doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
    doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
    doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper: load image as HTMLImageElement (works with jsPDF addImage)
    const loadImg = (src: string, cors?: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const img = new Image();
        if (cors) img.crossOrigin = cors;
        img.onload = () => res(img);
        img.onerror = () => rej(new Error("load-fail"));
        img.src = src;
      });

    // Try external URL first (with 3s CORS timeout), then local fallback, then skip
    const logoX = headerConfig.logoX ?? 20;
    const logoY = headerConfig.logoY ?? 10;
    const logoW = headerConfig.logoWidth ?? 20;
    const logoH = headerConfig.logoHeight ?? 20;

    let logoImg: HTMLImageElement | null = null;
    if (headerConfig.logoUrl) {
      try {
        logoImg = await Promise.race([
          loadImg(headerConfig.logoUrl, 'Anonymous'),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
        ]) as HTMLImageElement;
      } catch { logoImg = null; }
    }
    if (!logoImg) {
      try { logoImg = await loadImg(logoCaduceu); } catch { logoImg = null; }
    }
    if (logoImg) {
      try { doc.addImage(logoImg, 'PNG', logoX, logoY, logoW, logoH); } catch { /* skip */ }
    }

    doc.setFont("Ubuntu", "bold");
    doc.setFontSize(headerConfig.titleFontSize);
    doc.text(headerConfig.title, pageWidth / 2 + 10, 20, { align: "center" });

    doc.setFontSize(headerConfig.subtitleFontSize);
    doc.setFont("Ubuntu", "normal");
    doc.text(headerConfig.subtitle, pageWidth / 2 + 10, 26, { align: "center" });

    doc.setFontSize(headerConfig.infoFontSize);
    doc.text(headerConfig.address, pageWidth / 2, 34, { align: "center" });
    doc.text(headerConfig.contact, pageWidth / 2, 38, { align: "center" });

    doc.line(10, 42, pageWidth - 10, 42);
  };

  const exportFinanceiro = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO FINANCEIRO - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const sit of SITUATIONS) {
      if (!selectedSituations.includes(sit.id)) continue;

      const situationCompanies = allCompanies.filter(c => {
        if (sit.id === "mei") return c.regime_tributario === "mei";
        return c.situacao === sit.id && c.regime_tributario !== "mei";
      });

      if (situationCompanies.length === 0) continue;

      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      const body = situationCompanies.map(company => {
        const item = financeiro.find(f => f.empresa_id === company.id) || financeiro.find(f => f.nome_cliente === company.nome_empresa);
        return [
          company.nome_empresa,
          item?.tipo_servico || "—",
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item?.valor || 0),
          item?.pago || item?.status_pago ? "PAGO" : item ? "PENDENTE" : "—"
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Empresa/Cliente', 'Tipo', 'Valor', 'Status']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        styles: { font: 'Ubuntu' },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`Relatorio_Financeiro_${competencia}.pdf`);
  };

  const exportPessoal = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO DEPARTAMENTO PESSOAL - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const sit of SITUATIONS) {
      if (!selectedSituations.includes(sit.id)) continue;

      const situationCompanies = allCompanies.filter(c => {
        if (sit.id === "mei") return c.regime_tributario === "mei";
        return c.situacao === sit.id && c.regime_tributario !== "mei";
      });

      if (situationCompanies.length === 0) continue;

      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      const body = situationCompanies.map(company => {
        const item = pessoal.find(p => p.empresa_id === company.id);
        return [
          company.nome_empresa,
          item?.qtd_funcionarios || 0,
          item?.qtd_pro_labore || 0,
          item?.qtd_recibos || 0,
          item?.dctf_web_gerada ? "GERADA" : item ? "PENDENTE" : "—",
          item?.possui_vt || item?.possui_va || item?.possui_vc ? "SIM" : item ? "NÃO" : "—"
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Empresa', 'Func.', 'Pro-Lab.', 'Recibos', 'DCTF Web', 'Trab.']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        styles: { font: 'Ubuntu' },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`Relatorio_Pessoal_${competencia}.pdf`);
  };

  const exportFiscal = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO FISCAL - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const sit of SITUATIONS) {
      if (!selectedSituations.includes(sit.id)) continue;

      const situationCompanies = allCompanies.filter(c => {
        if (sit.id === "mei") return c.regime_tributario === "mei";
        return c.situacao === sit.id && c.regime_tributario !== "mei";
      });

      if (situationCompanies.length === 0) continue;

      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      const body = situationCompanies.map(company => {
        const item = fiscal.find(f => f.empresa_id === company.id);
        return [
          company.nome_empresa,
          item?.tipo_nota || "—",
          item?.status_guia || (item ? "PENDENTE" : "—"),
          item?.data_envio ? format(new Date(item.data_envio), "dd/MM/yyyy") : "—"
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Empresa', 'Tipo Nota', 'Status Guia', 'Data Env.']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        styles: { font: 'Ubuntu' },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`Relatorio_Fiscal_${competencia}.pdf`);
  };

  const exportVencimentos = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`VENCIMENTOS DO MÊS - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const sit of SITUATIONS) {
      if (!selectedSituations.includes(sit.id)) continue;

      const situationCompanies = allCompanies.filter(c => {
        if (sit.id === "mei") return c.regime_tributario === "mei";
        return c.situacao === sit.id && c.regime_tributario !== "mei";
      });

      if (situationCompanies.length === 0) continue;

      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      const body: string[][] = [];

      situationCompanies.forEach(company => {
        const items = vencimentos.filter(v => v.empresa === company.nome_empresa);
        if (items.length > 0) {
          items.forEach(item => {
            if (!item.data) return;
            try {
              const d = new Date(item.data.length === 10 ? item.data + "T12:00:00" : item.data);
              if (!isNaN(d.getTime())) {
                body.push([company.nome_empresa, item.tipo, format(d, "dd/MM/yyyy"), item.status]);
              }
            } catch { /* skip */ }
          });
        } else {
          body.push([company.nome_empresa, "—", "—", "—"]);
        }
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Empresa', 'Tipo de Documento', 'Vencimento', 'Status']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        styles: { font: 'Ubuntu' },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Vencido') data.cell.styles.textColor = [220, 38, 38];
            else if (data.cell.raw === 'Próximo') data.cell.styles.textColor = [217, 119, 6];
            else data.cell.styles.textColor = [22, 163, 74];
          }
        },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`Relatorio_Vencimentos_${competencia}.pdf`);
  };

  const exportOcorrencias = async () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO DE OCORRÊNCIAS - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const sit of SITUATIONS) {
      if (!selectedSituations.includes(sit.id)) continue;

      const situationCompanies = allCompanies.filter(c => {
        if (sit.id === "mei") return c.regime_tributario === "mei";
        return c.situacao === sit.id && c.regime_tributario !== "mei";
      });

      if (situationCompanies.length === 0) continue;

      if (currentY > 170) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(`SITUAÇÃO: ${sit.label.toUpperCase()}`, 14, currentY + 5);
      currentY += 8;
      doc.setTextColor(0, 0, 0);

      const body: string[][] = [];
      
      situationCompanies.forEach(company => {
        const records = ocorrencias.filter(o => o.empresa_id === company.id);
        if (records.length > 0) {
          records.forEach(r => {
            body.push([
              format(new Date(r.data_ocorrencia), "dd/MM/yyyy"),
              company.nome_empresa,
              r.departamento || "—",
              r.descricao || "—"
            ]);
          });
        } else {
          body.push(["—", company.nome_empresa, "—", "—"]);
        }
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Data', 'Empresa', 'Depto.', 'Descrição']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        styles: { font: 'Ubuntu' },
        columnStyles: { 3: { cellWidth: 80 } },
        didDrawPage: (data) => {
          currentY = data.cursor?.y || currentY;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.save(`Relatorio_Ocorrencias_${competencia}.pdf`);
  };

  const handleGenerateCustomReport = async (selection: { modules: string[]; fields: Record<string, string[]> }) => {
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO PERSONALIZADO - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    let currentY = 60;

    for (const modId of selection.modules) {
      const fields = selection.fields[modId];
      if (!fields || fields.length === 0) continue;

      const modLabel = modId.charAt(0).toUpperCase() + modId.slice(1);
      
      // Module Title
      doc.setFontSize(12);
      doc.setFont("Ubuntu", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(modLabel.toUpperCase(), 14, currentY);
      currentY += 5;

      const head: string[] = [];
      const body: any[][] = [];

      // Field Mapping
      if (modId === "financeiro") {
        if (fields.includes("empresa")) head.push("Empresa/Cliente");
        if (fields.includes("tipo")) head.push("Tipo");
        if (fields.includes("valor")) head.push("Valor");
        if (fields.includes("status")) head.push("Status");

        financeiro.forEach(item => {
          const row: any[] = [];
          if (fields.includes("empresa")) row.push(item.empresas?.nome_empresa || item.nome_cliente || "—");
          if (fields.includes("tipo")) row.push(item.tipo_servico || "Honorário Mensal");
          if (fields.includes("valor")) row.push(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor || 0));
          if (fields.includes("status")) row.push(item.pago || item.status_pago ? "PAGO" : "PENDENTE");
          body.push(row);
        });
      } else if (modId === "pessoal") {
        if (fields.includes("empresa")) head.push("Empresa");
        if (fields.includes("qtd_func")) head.push("Func.");
        if (fields.includes("qtd_pro")) head.push("Pro-Lab.");
        if (fields.includes("qtd_rec")) head.push("Recibos");
        if (fields.includes("dctf")) head.push("DCTF Web");
        if (fields.includes("beneficios")) head.push("Benef.");

        pessoal.forEach(item => {
          const row: any[] = [];
          if (fields.includes("empresa")) row.push(item.empresas?.nome_empresa || "—");
          if (fields.includes("qtd_func")) row.push(item.qtd_funcionarios || 0);
          if (fields.includes("qtd_pro")) row.push(item.qtd_pro_labore || 0);
          if (fields.includes("qtd_rec")) row.push(item.qtd_recibos || 0);
          if (fields.includes("dctf")) row.push(item.dctf_web_gerada ? "SIM" : "NÃO");
          if (fields.includes("beneficios")) row.push(item.possui_vt || item.possui_va || item.possui_vc ? "SIM" : "NÃO");
          body.push(row);
        });
      } else if (modId === "fiscal") {
        if (fields.includes("empresa")) head.push("Empresa");
        if (fields.includes("tipo_nota")) head.push("Tipo Nota");
        if (fields.includes("status_guia")) head.push("Status Guia");
        if (fields.includes("data_envio")) head.push("Data Env.");

        fiscal.forEach(item => {
          const row: any[] = [];
          if (fields.includes("empresa")) row.push(item.empresas?.nome_empresa || "—");
          if (fields.includes("tipo_nota")) row.push(item.tipo_nota || "—");
          if (fields.includes("status_guia")) row.push(item.status_guia || "PENDENTE");
          if (fields.includes("data_envio")) row.push(item.data_envio ? format(new Date(item.data_envio), "dd/MM/yyyy") : "—");
          body.push(row);
        });
      } else if (modId === "vencimentos") {
        if (fields.includes("empresa")) head.push("Empresa");
        if (fields.includes("tipo_doc")) head.push("Tipo");
        if (fields.includes("data_venc")) head.push("Vencimento");
        if (fields.includes("status")) head.push("Status");

        vencimentos.forEach(item => {
          const row: any[] = [];
          if (fields.includes("empresa")) row.push(item.empresa);
          if (fields.includes("tipo_doc")) row.push(item.tipo);
          if (fields.includes("data_venc")) row.push(item.data ? format(new Date(item.data), "dd/MM/yyyy") : "—");
          if (fields.includes("status")) row.push(item.status);
          body.push(row);
        });
      } else if (modId === "ocorrencias") {
        if (fields.includes("data")) head.push("Data");
        if (fields.includes("empresa")) head.push("Empresa");
        if (fields.includes("depto")) head.push("Depto.");
        if (fields.includes("descricao")) head.push("Descrição");

        ocorrencias.forEach(item => {
          const row: any[] = [];
          if (fields.includes("data")) row.push(format(new Date(item.data_ocorrencia), "dd/MM/yyyy"));
          if (fields.includes("empresa")) row.push(item.empresas?.nome_empresa || "—");
          if (fields.includes("depto")) row.push(item.departamento || "—");
          if (fields.includes("descricao")) row.push(item.descricao || "—");
          body.push(row);
        });
      }

      autoTable(doc, {
        startY: currentY,
        head: [head],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        styles: { font: 'Ubuntu' },
        margin: { top: 10, bottom: 10 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      // Check if need to add page
      if (currentY > 260 && modId !== selection.modules[selection.modules.length - 1]) {
        doc.addPage();
        currentY = 20;
      }
    }

    doc.save(`Relatorio_Personalizado_${competencia}.pdf`);
    toast.success("Relatório personalizado gerado com sucesso!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Central de Relatórios</h1>
          <p className="text-muted-foreground">Emissão de relatórios mensais consolidados em PDF</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          {/* Situation Filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Filtrar por Situação</span>
            <div className="flex flex-wrap items-center gap-2 bg-background/50 p-1.5 rounded-2xl border border-border/50 shadow-inner">
              {SITUATIONS.map(sit => (
                <button
                  key={sit.id}
                  onClick={() => toggleSituation(sit.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                    selectedSituations.includes(sit.id)
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {sit.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Competência</span>
            <div className="flex items-center gap-3 bg-background/50 p-1.5 rounded-2xl border border-border/50 shadow-inner">
              <Calendar size={16} className="text-primary ml-1" />
              <input 
                type="month" 
                value={competencia} 
                onChange={(e) => setCompetencia(e.target.value)}
                className="bg-transparent border-none text-sm font-bold outline-none focus:ring-0 w-32"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Carregando dados do período...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Financeiro */}
          <ReportCard 
            title="Financeiro" 
            description="Honorários Mensais, Serviços Esporádicos e IRPF."
            icon={<DollarSign size={24} />}
            count={financeiro.length}
            onExport={exportFinanceiro}
            color="bg-emerald-500/10 text-emerald-500"
          />

          {/* Departamento Pessoal */}
          <ReportCard 
            title="Depto. Pessoal" 
            description="Status de guias, funcionários e dados trabalhistas."
            icon={<Users size={24} />}
            count={pessoal.length}
            onExport={exportPessoal}
            color="bg-blue-500/10 text-blue-500"
          />

          {/* Fiscal */}
          <ReportCard 
            title="Fiscal" 
            description="Status das guias e tributação mensal."
            icon={<Shield size={24} />}
            count={fiscal.length}
            onExport={exportFiscal}
            color="bg-purple-500/10 text-purple-500"
          />

          {/* Vencimentos */}
          <ReportCard 
            title="Vencimentos" 
            description="Certificados, procurações, certidões, licenças e taxas vencendo no período."
            icon={<AlertCircle size={24} />}
            count={vencimentos.length}
            onExport={exportVencimentos}
            color="bg-amber-500/10 text-amber-500"
          />

          {/* Ocorrências */}
          <ReportCard 
            title="Ocorrências" 
            description="Resumo de todas as ocorrências datadas no mês."
            icon={<FileText size={24} />}
            count={ocorrencias.length}
            onExport={exportOcorrencias}
            color="bg-rose-500/10 text-rose-500"
          />

          {/* Relatório Personalizado */}
          <ReportCard 
            title="Personalizado" 
            description="Selecione os módulos e as informações que deseja incluir no seu relatório."
            icon={<MoveHorizontal size={24} />}
            count={5} // Just a symbolic number
            onExport={() => navigate("/relatorios/personalizado")}
            color="bg-slate-500/10 text-slate-500"
          />
        </div>
      )}
    </div>
  );
};

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  onExport: () => void;
  color: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, icon, count, onExport, color }) => (
  <div className="module-card group hover:scale-[1.02] transition-all cursor-default">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>
        {icon}
      </div>
      <div className="text-right">
        <span className="text-2xl font-black text-card-foreground">{count}</span>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registros</p>
      </div>
    </div>
    <h3 className="text-lg font-bold text-card-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
      {description}
    </p>
    <button 
      onClick={onExport}
      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${count > 0 ? "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"}`}
      disabled={count === 0}
    >
      <Download size={18} /> Gerar Relatório PDF
    </button>
  </div>
);

export default RelatoriosPage;
