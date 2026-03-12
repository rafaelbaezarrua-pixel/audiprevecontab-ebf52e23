import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Download, Calendar, DollarSign, 
  Shield, Users, AlertCircle, Building2,
  CheckCircle2, Circle, ChevronRight, ChevronLeft,
  ArrowLeft, Search, Filter, Layers, ListChecks
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { UbuntuRegular, UbuntuBold } from "@/lib/fonts/ubuntu-base64";

interface ModuleConfig {
  id: string;
  label: string;
  table: string;
  icon: React.ReactNode;
  color: string;
  fields: { id: string; label: string; accessor?: (item: any) => any }[];
}

const MODULES_CONFIG: ModuleConfig[] = [
  {
    id: "societario",
    label: "Societário (Empresas)",
    table: "empresas",
    icon: <Building2 size={18} />,
    color: "bg-blue-500",
    fields: [
      { id: "cnpj", label: "CNPJ" },
      { id: "data_abertura", label: "Data de Abertura" },
      { id: "regime_tributario", label: "Regime Tributário" },
      { id: "situacao", label: "Situação" },
      { id: "natureza_juridica", label: "Natureza Jurídica" },
    ]
  },
  {
    id: "fiscal",
    label: "Fiscal",
    table: "fiscal",
    icon: <Shield size={18} />,
    color: "bg-purple-500",
    fields: [
      { id: "tipo_nota", label: "Tipo de Nota" },
      { id: "status_guia", label: "Status da Guia" },
      { id: "competencia", label: "Competência" },
      { id: "data_envio", label: "Data de Envio" },
      { id: "aliquota", label: "Alíquota (%)" },
    ]
  },
  {
    id: "pessoal",
    label: "Depto. Pessoal",
    table: "pessoal",
    icon: <Users size={18} />,
    color: "bg-emerald-500",
    fields: [
      { id: "qtd_funcionarios", label: "Qtd Funcionários" },
      { id: "qtd_pro_labore", label: "Qtd Pró-Labore" },
      { id: "qtd_recibos", label: "Qtd Recibos" },
      { id: "dctf_web_gerada", label: "DCTF Web Gerada", accessor: (i) => i.dctf_web_gerada ? "Sim" : "Não" },
      { id: "fgts_status", label: "Status FGTS" },
      { id: "inss_status", label: "Status INSS" },
    ]
  },
  {
    id: "honorarios",
    label: "Honorários",
    table: "honorarios_mensal",
    icon: <DollarSign size={18} />,
    color: "bg-amber-500",
    fields: [
      { id: "competencia", label: "Competência" },
      { id: "valor_total", label: "Valor Total", accessor: (i) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.valor_total || 0) },
      { id: "pago", label: "Status de Pagamento", accessor: (i) => i.pago ? "Pago" : "Pendente" },
      { id: "data_vencimento", label: "Data de Vencimento" },
    ]
  },
  {
    id: "certificados",
    label: "Certificados Digitais",
    table: "certificados_digitais",
    icon: <Shield size={18} />,
    color: "bg-cyan-500",
    fields: [
      { id: "data_vencimento", label: "Vencimento" },
      { id: "observacao", label: "Observação" },
    ]
  },
  {
    id: "certidoes",
    label: "Certidões Negativas",
    table: "certidoes",
    icon: <FileText size={18} />,
    color: "bg-indigo-500",
    fields: [
      { id: "tipo_certidao", label: "Tipo de Certidão" },
      { id: "vencimento", label: "Vencimento" },
    ]
  },
  {
    id: "licencas",
    label: "Licenças Municipais",
    table: "licencas",
    icon: <AlertCircle size={18} />,
    color: "bg-rose-500",
    fields: [
      { id: "tipo_licenca", label: "Tipo de Licença" },
      { id: "status", label: "Situação" },
      { id: "vencimento", label: "Vencimento" },
      { id: "numero_processo", label: "Processo" },
    ]
  },
  {
    id: "procuracoes",
    label: "Procurações",
    table: "procuracoes",
    icon: <FileText size={18} />,
    color: "bg-orange-500",
    fields: [
      { id: "data_vencimento", label: "Vencimento" },
      { id: "observacao", label: "Observação" },
    ]
  },
  {
    id: "parcelamentos",
    label: "Parcelamentos",
    table: "parcelamentos",
    icon: <Layers size={18} />,
    color: "bg-teal-500",
    fields: [
      { id: "tipo_parcelamento", label: "Tipo" },
      { id: "qtd_parcelas", label: "Parcelas" },
      { id: "data_inicio", label: "Início" },
      { id: "previsao_termino", label: "Término Estimado" },
    ]
  },
  {
    id: "recalculos",
    label: "Recálculos",
    table: "recalculos",
    icon: <ListChecks size={18} />,
    color: "bg-lime-500",
    fields: [
      { id: "guia", label: "Guia" },
      { id: "competencia", label: "Competência" },
      { id: "data_recalculo", label: "Data Recálculo" },
      { id: "status", label: "Status" },
    ]
  },
  {
    id: "ocorrencias",
    label: "Ocorrências",
    table: "ocorrencias",
    icon: <AlertCircle size={18} />,
    color: "bg-red-500",
    fields: [
      { id: "data_ocorrencia", label: "Data" },
      { id: "departamento", label: "Departamento" },
      { id: "descricao", label: "Descrição" },
    ]
  },
  {
    id: "agendamentos",
    label: "Agendamentos",
    table: "agendamentos",
    icon: <Calendar size={18} />,
    color: "bg-sky-500",
    fields: [
      { id: "assunto", label: "Assunto" },
      { id: "data", label: "Data" },
      { id: "horario", label: "Horário" },
      { id: "status", label: "Status" },
    ]
  },
  {
    id: "declaracoes_anuais",
    label: "Declarações Anuais",
    table: "declaracoes_anuais",
    icon: <FileText size={18} />,
    color: "bg-violet-500",
    fields: [
      { id: "tipo_declaracao", label: "Tipo" },
      { id: "ano", label: "Ano Base" },
      { id: "enviada", label: "Enviada", accessor: (i) => i.enviada ? "Sim" : "Não" },
    ]
  }
];

const RelatorioPersonalizadoPage: React.FC = () => {
  const navigate = useNavigate();
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<any>(null);

  useEffect(() => {
    fetchHeaderConfig();
  }, []);

  const fetchHeaderConfig = async () => {
    const { data } = await supabase.from("app_config").select("value").eq("key", "pdf_header_config").maybeSingle();
    if (data?.value) {
       try { setHeaderConfig(JSON.parse(data.value)); } catch (e) { console.error(e); }
    }
  };

  const toggleModule = (id: string) => {
    if (selectedModules.includes(id)) {
      setSelectedModules(prev => prev.filter(m => m !== id));
      const newFields = { ...selectedFields };
      delete newFields[id];
      setSelectedFields(newFields);
    } else {
      setSelectedModules(prev => [...prev, id]);
      const mod = MODULES_CONFIG.find(m => m.id === id);
      setSelectedFields(prev => ({ ...prev, [id]: mod?.fields.map(f => f.id) || [] }));
    }
  };

  const toggleField = (modId: string, fieldId: string) => {
    const current = selectedFields[modId] || [];
    if (current.includes(fieldId)) {
      setSelectedFields(prev => ({ ...prev, [modId]: current.filter(f => f !== fieldId) }));
    } else {
      setSelectedFields(prev => ({ ...prev, [modId]: [...current, fieldId] }));
    }
  };

  const generatePDFHeader = async (doc: jsPDF) => {
    doc.addFileToVFS("Ubuntu-Regular.ttf", UbuntuRegular);
    doc.addFont("Ubuntu-Regular.ttf", "Ubuntu", "normal");
    doc.addFileToVFS("Ubuntu-Bold.ttf", UbuntuBold);
    doc.addFont("Ubuntu-Bold.ttf", "Ubuntu", "bold");

    const config = headerConfig || {
       title: "Audipreve Contabilidade",
       subtitle: "CRC-PR nº. 01.0093/O - 6",
       address: "Rua Jequitibá, n.º 789, 1º andar, sala 01, Bairro Nações, Fazenda Rio Grande/PR",
       contact: "Fone: (41) 3604-8059 | societario@audiprevecontabilidade.com.br"
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("Ubuntu", "bold");
    doc.setFontSize(20);
    doc.text(config.title, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("Ubuntu", "normal");
    doc.text(config.subtitle, pageWidth / 2, 26, { align: "center" });
    doc.setFontSize(8);
    doc.text(config.address, pageWidth / 2, 32, { align: "center" });
    doc.text(config.contact, pageWidth / 2, 36, { align: "center" });
    doc.line(10, 40, pageWidth - 10, 40);
  };

  const handleGenerate = async () => {
    if (selectedModules.length === 0) {
      toast.error("Selecione pelo menos um módulo");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch All Companies First
      const { data: allCompanies, error: companiesError } = await supabase
        .from("empresas")
        .select("id, nome_empresa, cnpj, data_abertura, regime_tributario, situacao, natureza_juridica")
        .order("nome_empresa");

      if (companiesError) throw companiesError;
      if (!allCompanies) return;

      const doc = new jsPDF({ orientation: 'landscape' });
      await generatePDFHeader(doc);
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.setFont("Ubuntu", "bold");
      doc.text(`RELATÓRIO PERSONALIZADO DO SISTEMA - ${competencia}`, pageWidth / 2, 50, { align: "center" });

      let currentY = 60;

      for (const modId of selectedModules) {
        const mod = MODULES_CONFIG.find(m => m.id === modId)!;
        const fieldsToInclude = selectedFields[modId] || [];
        if (fieldsToInclude.length === 0) continue;

        let moduleData: any[] = [];

        // Special case: if it's the societario module, we already have the data
        if (modId === "societario") {
          moduleData = allCompanies;
        } else {
          // Fetch Module Data
          let query = supabase.from(mod.table as any).select("*");
          
          if (["fiscal", "pessoal", "honorarios", "recalculos", "licencas_taxas", "agendamentos"].includes(modId)) {
             query = query.eq("competencia", competencia);
          } else if (modId === "ocorrencias") {
             const start = `${competencia}-01`;
             const next = new Date(competencia + "-01");
             next.setMonth(next.getMonth() + 1);
             query = query.gte("data_ocorrencia", start).lt("data_ocorrencia", next.toISOString().split('T')[0]);
          }

          const { data, error } = await query;
          if (error) {
            console.error(`Erro ao buscar ${mod.label}:`, error);
          } else {
            moduleData = data || [];
          }
        }

        // Merge logic: ensure every company is present
        // If a company has multiple records (like Ocorrências), we show all of them.
        // If it has none, we show the company once with empty fields.
        let mergedRows: any[] = [];
        
        allCompanies.forEach(company => {
          const companyRecords = moduleData.filter(d => d.empresa_id === company.id);
          
          if (companyRecords.length > 0) {
            companyRecords.forEach(record => {
              mergedRows.push({ ...company, ...record, isPartial: false });
            });
          } else {
            // No data for this company in this module, add an empty row
            mergedRows.push({ ...company, isPartial: true });
          }
        });

        // Module Section Header
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont("Ubuntu", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text(mod.label.toUpperCase(), 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 5;

        const head = [["Empresa", ...mod.fields.filter(f => fieldsToInclude.includes(f.id)).map(f => f.label)]];
        const body = mergedRows.map(item => [
          item.nome_empresa || "—",
          ...mod.fields.filter(f => fieldsToInclude.includes(f.id)).map(f => {
            if (item.isPartial && modId !== "societario") return "—";
            
            const val = item[f.id];
            if (f.accessor) return f.accessor(item);
            if (val === null || val === undefined) return "—";
            
            if (typeof val === 'string' && val.includes('T') && val.length > 10) {
               try { return format(new Date(val), "dd/MM/yyyy HH:mm"); } catch { return val; }
            }
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
               try { return format(new Date(val + "T12:00:00"), "dd/MM/yyyy"); } catch { return val; }
            }
            return String(val);
          })
        ]);

        autoTable(doc, {
          startY: currentY,
          head: head,
          body: body,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7, cellPadding: 2 },
          styles: { font: 'Ubuntu' },
          margin: { horizontal: 10 },
          didDrawPage: (data) => {
            currentY = data.cursor?.y || currentY;
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.save(`Relatorio_Personalizado_${competencia}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border/50 shadow-sm shadow-primary/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/relatorios")}
            className="p-3 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-card-foreground">Relatório Personalizado</h1>
            <p className="text-muted-foreground text-sm">Monte seu relatório selecionando módulos e dados específicos</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-background p-2 rounded-2xl border border-border">
          <Calendar className="text-primary ml-2" size={20} />
          <input 
            type="month" 
            value={competencia} 
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 py-2 bg-transparent text-sm font-black outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module Selection Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm overflow-hidden">
             <div className="flex items-center gap-2 mb-6">
               <Layers className="text-primary" size={20} />
               <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Departamentos</h3>
             </div>
             
             <div className="space-y-2">
               {MODULES_CONFIG.map(mod => (
                 <button
                   key={mod.id}
                   onClick={() => toggleModule(mod.id)}
                   className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                     selectedModules.includes(mod.id)
                       ? "border-primary bg-primary/5 shadow-inner"
                       : "border-transparent hover:bg-muted/50 text-muted-foreground"
                   }`}
                 >
                   <div className={`p-2.5 rounded-xl ${selectedModules.includes(mod.id) ? mod.color + " text-white" : "bg-muted text-muted-foreground"}`}>
                     {mod.icon}
                   </div>
                   <span className={`font-bold text-sm flex-1 ${selectedModules.includes(mod.id) ? "text-card-foreground" : ""}`}>
                     {mod.label}
                   </span>
                   {selectedModules.includes(mod.id) && <CheckCircle2 size={18} className="text-primary" />}
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Field Selection Area */}
        <div className="lg:col-span-8 space-y-6">
          {selectedModules.length === 0 ? (
            <div className="bg-card rounded-3xl border border-dashed border-border/60 p-20 flex flex-col items-center justify-center text-center opacity-60">
               <div className="p-6 rounded-full bg-muted mb-4">
                 <ListChecks size={40} className="text-muted-foreground" />
               </div>
               <h3 className="text-xl font-bold text-card-foreground">Nenhum módulo selecionado</h3>
               <p className="text-sm text-muted-foreground max-w-xs mt-2">
                 Selecione um ou mais departamentos ao lado para começar a configurar seu relatório.
               </p>
            </div>
          ) : (
            selectedModules.map(modId => {
              const mod = MODULES_CONFIG.find(m => m.id === modId)!;
              return (
                <div key={modId} className="bg-card rounded-3xl border border-border/50 shadow-sm animate-scale-in">
                  <div className="p-6 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${mod.color} text-white`}>
                        {mod.icon}
                      </div>
                      <h3 className="font-black text-card-foreground text-lg">{mod.label}</h3>
                    </div>
                    <button 
                      onClick={() => toggleModule(modId)}
                      className="text-xs font-bold text-destructive hover:opacity-80"
                    >
                      Remover módulo
                    </button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {mod.fields.map(field => (
                      <button
                        key={field.id}
                        onClick={() => toggleField(modId, field.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                          selectedFields[modId]?.includes(field.id)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/20"
                        }`}
                      >
                         <div className={`transition-colors ${selectedFields[modId]?.includes(field.id) ? "text-primary" : "text-muted-foreground/40"}`}>
                           {selectedFields[modId]?.includes(field.id) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                         </div>
                         <span className="text-xs font-bold">{field.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4">
         <div className="bg-card/80 backdrop-blur-xl border border-primary/20 rounded-full p-2 shadow-2xl flex items-center justify-between">
            <div className="pl-6">
               <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Configuração</p>
               <p className="text-sm font-bold text-card-foreground">
                 {selectedModules.length} módulos selecionados
               </p>
            </div>
            <button
               onClick={handleGenerate}
               disabled={loading || selectedModules.length === 0}
               className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm transition-all ${
                 loading || selectedModules.length === 0
                   ? "bg-muted text-muted-foreground cursor-not-allowed"
                   : "bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
               }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {loading ? "Gerando..." : "Gerar Relatório PDF"}
            </button>
         </div>
      </div>
    </div>
  );
};

export default RelatorioPersonalizadoPage;
