import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Download, Calendar, DollarSign, 
  Shield, ClipboardList, AlertCircle, Building2,
  Users, CheckCircle, Circle, Save, Search
} from "lucide-react";
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

const RelatoriosPage: React.FC = () => {
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER);
  
  // Data States
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [pessoal, setPessoal] = useState<any[]>([]);
  const [fiscal, setFiscal] = useState<any[]>([]);
  const [vencimentos, setVencimentos] = useState<{empresa: string; tipo: string; data: string; status: string}[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);

  useEffect(() => {
    fetchHeaderConfig();
    fetchReportData();
  }, [competencia]);

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
        
      const { data: espData } = await supabase
        .from("servicos_esporadicos")
        .select("*")
        .eq("competencia", competencia);

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
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO FINANCEIRO - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    const body = financeiro.map(item => [
      item.empresas?.nome_empresa || item.nome_cliente || "—",
      item.tipo_servico || "Honorário Mensal",
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor || 0),
      item.pago || item.status_pago ? "PAGO" : "PENDENTE"
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Empresa/Cliente', 'Tipo', 'Valor', 'Status']],
      body: body,
      theme: 'grid',
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      styles: { font: 'Ubuntu' }
    });

    doc.save(`Relatorio_Financeiro_${competencia}.pdf`);
  };

  const exportPessoal = async () => {
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO DEPARTAMENTO PESSOAL - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    const body = pessoal.map(item => [
      item.empresas?.nome_empresa || "—",
      item.qtd_funcionarios || 0,
      item.qtd_pro_labore || 0,
      item.qtd_recibos || 0,
      item.dctf_web_gerada ? "GERADA" : "PENDENTE",
      item.possui_vt || item.possui_va || item.possui_vc ? "SIM" : "NÃO"
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Empresa', 'Func.', 'Pro-Lab.', 'Recibos', 'DCTF Web', 'Trab.']],
      body: body,
      theme: 'grid',
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      styles: { font: 'Ubuntu' }
    });

    doc.save(`Relatorio_Pessoal_${competencia}.pdf`);
  };

  const exportFiscal = async () => {
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO FISCAL - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    const body = fiscal.map(item => [
      item.empresas?.nome_empresa || "—",
      item.tipo_nota || "—",
      item.status_guia || "PENDENTE",
      item.data_envio ? format(new Date(item.data_envio), "dd/MM/yyyy") : "—"
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Empresa', 'Tipo Nota', 'Status Guia', 'Data Env.']],
      body: body,
      theme: 'grid',
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      styles: { font: 'Ubuntu' }
    });

    doc.save(`Relatorio_Fiscal_${competencia}.pdf`);
  };

  const exportVencimentos = async () => {
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`VENCIMENTOS DO MÊS - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    const body = vencimentos.reduce<string[][]>((acc, item) => {
      if (!item.data) return acc;
      try {
        const d = new Date(item.data.length === 10 ? item.data + "T12:00:00" : item.data);
        if (isNaN(d.getTime())) return acc;
        acc.push([item.empresa, item.tipo, format(d, "dd/MM/yyyy"), item.status]);
      } catch { /* skip malformed dates */ }
      return acc;
    }, []);

    autoTable(doc, {
      startY: 60,
      head: [['Empresa', 'Tipo de Documento', 'Vencimento', 'Status']],
      body: body,
      theme: 'grid',
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      styles: { font: 'Ubuntu' },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Vencido') data.cell.styles.textColor = [220, 38, 38];
          else if (data.cell.raw === 'Próximo') data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [22, 163, 74];
        }
      }
    });

    doc.save(`Relatorio_Vencimentos_${competencia}.pdf`);
  };

  const exportOcorrencias = async () => {
    const doc = new jsPDF();
    await generatePDFHeader(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(14);
    doc.setFont("Ubuntu", "bold");
    doc.text(`RELATÓRIO DE OCORRÊNCIAS - ${competencia}`, pageWidth / 2, 50, { align: "center" });

    const body = ocorrencias.map(item => [
      format(new Date(item.data_ocorrencia), "dd/MM/yyyy"),
      item.empresas?.nome_empresa || "—",
      item.departamento || "—",
      item.descricao || "—"
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Data', 'Empresa', 'Depto.', 'Descrição']],
      body: body,
      theme: 'grid',
      headStyles: { fillGray: 200, textColor: 0, fontStyle: 'bold' },
      styles: { font: 'Ubuntu' },
      columnStyles: { 3: { cellWidth: 80 } }
    });

    doc.save(`Relatorio_Ocorrencias_${competencia}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Central de Relatórios</h1>
          <p className="text-muted-foreground">Emissão de relatórios mensais consolidados em PDF</p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="text-primary" />
          <input 
            type="month" 
            value={competencia} 
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl bg-background text-sm font-bold outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
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
