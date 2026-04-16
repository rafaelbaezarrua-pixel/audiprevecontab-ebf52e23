import React, { useState, useEffect, useMemo } from "react";
import { format, parseISO, eachDayOfInterval, isWeekend, addDays, startOfDay, endOfDay, isWithinInterval, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { jsPDF } from "jspdf";
import { Download, Calculator, User, Clock, Percent, Moon, Calendar, FileText, CheckCircle2, RotateCcw, Zap, Eye, Plus, Trash2, Edit2, Check } from "lucide-react";
import { toast } from "sonner";
import { numeroPorExtenso } from "@/lib/extenso";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Funcionario {
    id: string;
    nome: string;
    cpf: string;
    cargo: string;
}

interface Empresa {
    id: string;
    nome_empresa: string;
    cnpj: string;
    endereco: any;
}

interface Props {
    empresa: Empresa;
    funcionarios: Funcionario[];
}

interface RegistroDiario {
    e1: string;
    s1: string;
    e2: string;
    s2: string;
}

export const PontoCalculoForm: React.FC<Props> = ({ empresa, funcionarios }) => {
    const [selectedFuncId, setSelectedFuncId] = useState("");
    const [periodoInicio, setPeriodoInicio] = useState(format(new Date(), "yyyy-MM-01"));
    const [periodoFim, setPeriodoFim] = useState(format(new Date(), "yyyy-MM-dd"));
    const [salarioBase, setSalarioBase] = useState(0);
    const [padraoE1, setPadraoE1] = useState("08:00");
    const [padraoS1, setPadraoS1] = useState("12:00");
    const [padraoE2, setPadraoE2] = useState("13:00");
    const [padraoS2, setPadraoS2] = useState("17:00");
    const [cargaHorariaMensal, setCargaHorariaMensal] = useState(220);
    const [escala, setEscala] = useState("6x1");
    
    // Grid de Ponto
    const [registros, setRegistros] = useState<Record<string, RegistroDiario>>({});
    
    // Configurações Gerais
    const [porcentagemExtra, setPorcentagemExtra] = useState(50);
    const [compensarAtrasos, setCompensarAtrasos] = useState(false);
    const [calcularDSR, setCalcularDSR] = useState(true);

    // Preview do Recibo Editable
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewTitle, setPreviewTitle] = useState("RECIBO DE QUITAÇÃO FINAL");
    const [previewHeader, setPreviewHeader] = useState("");
    const [previewReference, setPreviewReference] = useState("");
    const [previewFooter, setPreviewFooter] = useState("");
    const [memorialText, setMemorialText] = useState("");
    const [proventosList, setProventosList] = useState<{ id: string, desc: string, valor: number }[]>([]);
    const [descontosList, setDescontosList] = useState<{ id: string, desc: string, valor: number }[]>([]);

    const diasNoPeriodo = useMemo(() => {
        try {
            if (!periodoInicio || !periodoFim) return [];
            return eachDayOfInterval({
                start: parseISO(periodoInicio),
                end: parseISO(periodoFim)
            });
        } catch (e) {
            return [];
        }
    }, [periodoInicio, periodoFim]);

    const formatTimeInput = (val: string) => {
        if (!val) return "";
        let clean = val.replace(/\D/g, '');
        if (!clean) return "";

        if (clean.length <= 2) {
            let h = parseInt(clean, 10);
            if (h > 23) h = 23;
            return `${h.toString().padStart(2, '0')}:00`;
        }
        
        if (clean.length === 3) {
            clean = "0" + clean;
        }

        let hStr = clean.substring(0, 2);
        let mStr = clean.substring(2, 4);

        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);

        if (h > 23) h = 23;
        if (m > 59) m = 59;

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const timeToDecimal = (time: string) => {
        if (!time || !time.includes(":")) return 0;
        const [hours, minutes] = time.split(":").map(Number);
        return hours + (minutes / 60);
    };

    const decimalToTime = (decimal: number) => {
        const hours = Math.floor(Math.abs(decimal));
        const minutes = Math.round((Math.abs(decimal) - hours) * 60);
        const prefix = decimal < 0 ? "-" : "";
        return `${prefix}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const arredondaBr = (valor: number) => {
        const factor = 1000;
        const tempNumber = valor * factor; 
        const isNegative = tempNumber < 0;
        const finalTemp = Math.floor(Math.abs(tempNumber)); 
        const lastDigit = finalTemp % 10;
        let twoDecimals = Math.floor(finalTemp / 10); 
        if (lastDigit > 6) twoDecimals += 1;
        return (isNegative ? -twoDecimals : twoDecimals) / 100;
    };

    // Função para calcular horas noturnas em um intervalo
    const getNightHours = (startStr: string, endStr: string) => {
        if (!startStr || !endStr) return 0;
        
        let h1 = timeToDecimal(startStr);
        let h2 = timeToDecimal(endStr);
        
        // Se a saída for antes da entrada, assumimos que virou o dia
        if (h2 < h1) h2 += 24;

        // Período noturno: 22:00 às 05:00
        const nightStart = 22;
        const nightEnd = 5 + 24; // 05:00 do dia seguinte

        const calcOverlap = (s: number, e: number, ns: number, ne: number) => {
            return Math.max(0, Math.min(e, ne) - Math.max(s, ns));
        };

        // Sobreposição no dia atual (22:00 - 24:00) e dia seguinte (00:00 - 05:00)
        let total = calcOverlap(h1, h2, 22, 29); // 22h até 05h do dia seguinte
        
        // E se o turno começou antes e pegou o período noturno do dia anterior (raro)
        total += calcOverlap(h1 + 24, h2 + 24, 22, 29);

        return total;
    };

    const calculateDayTotals = (r: RegistroDiario, dia: Date) => {
        let extra = 0;
        let atraso = 0;
        let nightShift = 0;
        let totalWorked = 0;

        const dayOfWeek = parseInt(format(dia, "i")); // 1=Mon, 7=Sun
        const isWorkDay = escala === "5x2" ? (dayOfWeek >= 1 && dayOfWeek <= 5) : 
                          escala === "6x1" ? (dayOfWeek >= 1 && dayOfWeek <= 6) : 
                          (dayOfWeek >= 1 && dayOfWeek <= 6); // Default assuming Sunday off

        const pE1 = timeToDecimal(padraoE1);
        const pS1 = timeToDecimal(padraoS1);
        const pE2 = timeToDecimal(padraoE2);
        const pS2 = timeToDecimal(padraoS2);

        // Block 1 (E1 -> S1)
        if (r.e1 && r.s1) {
            const ae1 = timeToDecimal(r.e1);
            const as1 = timeToDecimal(r.s1);
            totalWorked += Math.max(0, as1 - ae1);
            
            if (ae1 > pE1) atraso += (ae1 - pE1);
            if (ae1 < pE1) extra += (pE1 - ae1);
            
            if (as1 < pS1) atraso += (pS1 - as1);
            if (as1 > pS1) extra += (as1 - pS1);

            nightShift += getNightHours(r.e1, r.s1);
        } else if (isWorkDay) {
            atraso += Math.max(0, pS1 - pE1);
        }

        // Block 2 (E2 -> S2)
        if (r.e2 && r.s2) {
            const ae2 = timeToDecimal(r.e2);
            const as2 = timeToDecimal(r.s2);
            totalWorked += Math.max(0, as2 - ae2);
            
            if (ae2 > pE2) atraso += (ae2 - pE2);
            if (ae2 < pE2) extra += (pE2 - ae2);
            
            if (as2 < pS2) atraso += (pS2 - as2);
            if (as2 > pS2) extra += (as2 - pS2);

            nightShift += getNightHours(r.e2, r.s2);
        } else if (isWorkDay) {
            atraso += Math.max(0, pS2 - pE2);
        }
        
        return { totalWorked, extra, atraso, nightShift };
    };

    // Totais Consolidados
    const totaisGerais = useMemo(() => {
        let extras = 0;
        let atrasos = 0;
        let noturno = 0;
        let diasUteisComTrabalho = 0;
        let domingosEFeriados = 0;

        diasNoPeriodo.forEach(dia => {
            const dateStr = format(dia, "yyyy-MM-dd");
            const r = registros[dateStr] || { e1: "", s1: "", e2: "", s2: "" };
            
            const dayResults = calculateDayTotals(r, dia);
            extras += dayResults.extra;
            atrasos += dayResults.atraso;
            noturno += dayResults.nightShift;
            
            if (dayResults.totalWorked > 0) diasUteisComTrabalho++;

            if (isWeekend(dia) && format(dia, "i") === "7") { // Domingo
                domingosEFeriados++;
            }
        });

        // Compensação
        if (compensarAtrasos) {
            if (extras >= atrasos) {
                extras -= atrasos;
                atrasos = 0;
            } else {
                atrasos -= extras;
                extras = 0;
            }
        }

        const valorHora = salarioBase / 220; // Padrão CLT
        
        const formatDecExato = (dec: number) => {
            const h = Math.floor(dec);
            const m = Math.round((dec - h) * 60);
            return h + (m / 60);
        };

        const exactExtras = formatDecExato(extras);
        const exactAtrasos = formatDecExato(atrasos);
        const exactNoturno = formatDecExato(noturno);

        const vExtras = arredondaBr(exactExtras * valorHora * (1 + (porcentagemExtra / 100)));
        const vNoturnoAdic = arredondaBr((exactNoturno * 1.142857) * valorHora * 0.2);
        const vExtrasNoturno = arredondaBr((exactNoturno * 1.142857) * valorHora * (1 + (porcentagemExtra / 100)) * 0.2);

        // Versão simplificada do DSR para escala 6x1 (1/6 = ~16.66%)
        const totalVariaveis = vExtras + vNoturnoAdic + vExtrasNoturno;
        const vDSRSimplificado = calcularDSR ? arredondaBr(totalVariaveis / 6) : 0;

        return {
            extras,
            atrasos,
            noturno,
            valorExtras: vExtras,
            valorNoturno: vNoturnoAdic,
            valorDSR: vDSRSimplificado,
            valorAtrasos: arredondaBr(exactAtrasos * valorHora)
        };
    }, [registros, diasNoPeriodo, salarioBase, porcentagemExtra, compensarAtrasos, calcularDSR]);

    const handleUpdateRegistro = (dateStr: string, field: keyof RegistroDiario, value: string) => {
        setRegistros(prev => ({
            ...prev,
            [dateStr]: {
                ...(prev[dateStr] || { e1: "", s1: "", e2: "", s2: "" }),
                [field]: value
            }
        }));
    };

    const handlePreencherPadrao = () => {
        const newRegistros: Record<string, RegistroDiario> = { ...registros };
        diasNoPeriodo.forEach(dia => {
            const dayOfWeek = parseInt(format(dia, "i"));
            const isWorkDay = escala === "5x2" ? (dayOfWeek >= 1 && dayOfWeek <= 5) : 
                              escala === "6x1" ? (dayOfWeek >= 1 && dayOfWeek <= 6) : 
                              (dayOfWeek >= 1 && dayOfWeek <= 6);

            if (isWorkDay) {
                newRegistros[format(dia, "yyyy-MM-dd")] = { e1: padraoE1, s1: padraoS1, e2: padraoE2, s2: padraoS2 };
            }
        });
        setRegistros(newRegistros);
        toast.info(`Horários padrão (${padraoE1}-${padraoS1} / ${padraoE2}-${padraoS2}) preenchidos nos dias úteis`);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startDateIndex: number, startField: keyof RegistroDiario) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData("Text");
        if (!clipboardData) return;

        const rows = clipboardData.split(/\r?\n/).map(row => row.split(/\t/));
        const newRegistros = { ...registros };
        const fields: (keyof RegistroDiario)[] = ["e1", "s1", "e2", "s2"];
        const startFieldIndex = fields.indexOf(startField);

        for (let r = 0; r < rows.length; r++) {
            if (rows[r].length === 1 && rows[r][0] === "") continue; // Skip empty rows
            
            const targetDateIndex = startDateIndex + r;
            if (targetDateIndex >= diasNoPeriodo.length) continue; // Out of bounds
            
            const dateStr = format(diasNoPeriodo[targetDateIndex], "yyyy-MM-dd");
            if (!newRegistros[dateStr]) newRegistros[dateStr] = { e1: "", s1: "", e2: "", s2: "" };
            
            for (let c = 0; c < rows[r].length; c++) {
                const targetFieldIndex = startFieldIndex + c;
                if (targetFieldIndex < fields.length) {
                    const val = rows[r][c].trim();
                    newRegistros[dateStr][fields[targetFieldIndex]] = val; // Apply value even if empty to clear cells
                }
            }
        }
        
        setRegistros(newRegistros);
        toast.success("Dados colados com sucesso!");
    };

    const handlePreview = () => {
        if (!selectedFuncId) {
            toast.error("Selecione um funcionário");
            return;
        }

        const funcionario = funcionarios.find(f => f.id === selectedFuncId);
        if (!funcionario) return;

        const { valorExtras, valorNoturno, valorDSR, valorAtrasos } = totaisGerais;
        const initialProventos = [
            { id: `p_saldo`, desc: `SALDO SALÁRIO`, valor: salarioBase },
            valorExtras > 0 && { id: `p_extra`, desc: `HORA EXTRA ${porcentagemExtra}% (${decimalToTime(totaisGerais.extras)})`, valor: valorExtras },
            valorNoturno > 0 && { id: `p_noturno`, desc: `ADICIONAL NOTURNO (${decimalToTime(totaisGerais.noturno)})`, valor: valorNoturno },
            valorDSR > 0 && { id: `p_dsr`, desc: `DSR SOBRE VARIÁVEIS`, valor: valorDSR }
        ].filter(Boolean) as any[];

        const initialDescontos = [
            valorAtrasos > 0 && { id: `d_atraso`, desc: `ATRASOS/FALTAS (${decimalToTime(totaisGerais.atrasos)})`, valor: valorAtrasos }
        ].filter(Boolean) as any[];

        const totalProventosTemp = initialProventos.reduce((acc, p) => acc + p.valor, 0);
        const totalDescontosTemp = initialDescontos.reduce((acc, d) => acc + d.valor, 0);
        const liquidoTemp = totalProventosTemp - totalDescontosTemp;

        const logradouro = empresa.endereco?.logradouro || empresa.endereco?.rua || "Endereço";
        const numero = empresa.endereco?.numero || "S/N";
        const cidade = empresa.endereco?.cidade || empresa.endereco?.city || "Cidade";
        const estado = empresa.endereco?.estado || empresa.endereco?.state || "PR";
        const cep = empresa.endereco?.cep || "00000-000";

        // Pré-popular textos dinâmicos (só na primeira vez ou se não houver edição manual complexa)
        const head = `Recebi de ${empresa.nome_empresa}, CNPJ nº ${empresa.cnpj}, pessoa juridica de direito privado, com sede a Rua: ${logradouro}, nº ${numero}, ${cidade}/${estado}, CEP: ${cep}, a quantia supracitada de R$ ${liquidoTemp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${numeroPorExtenso(liquidoTemp)}), provenientes conforme abaixo descriminadas.`;
        setPreviewHeader(head);

        const ref = `Referente ao cálculo de ponto de ${funcionario.nome} (CPF: ${funcionario.cpf}) no período de ${format(parseISO(periodoInicio), 'dd/MM/yyyy')} a ${format(parseISO(periodoFim), 'dd/MM/yyyy')}.`;
        setPreviewReference(ref);
        
        const decl = "Declaro para os devidos fins que recebi a quantia acima citada, pela qual dou plena e geral quitação pelos serviços prestados no período mencionado, nada mais tendo a reclamar a qualquer título.";
        setPreviewFooter(decl);

        const formatDecExato = (dec: number) => {
            const h = Math.floor(dec);
            const m = Math.round((dec - h) * 60);
            return h + (m / 60);
        };

        const mem = `COMPROVANTE DE ARITMÉTICA E MEMÓRIA DE CÁLCULO\n` +
            `======================================================\n` +
            `Salário Base: R$ ${salarioBase.toFixed(2)}\n` +
            `Divisor Padrão Mensal CLT: 220 horas\n` +
            `Valor da Hora Simples: R$ ${(salarioBase / 220).toFixed(4)}\n\n` +
            `[1] APURAÇÃO DE HORAS EXTRAS (${porcentagemExtra}%)\n` +
            `    Totais no Relógio: ${decimalToTime(totaisGerais.extras)}\n` +
            `    Fração Centesimal Exata: ${formatDecExato(totaisGerais.extras).toFixed(4)}h\n` +
            `    Fórmula: ${formatDecExato(totaisGerais.extras).toFixed(4)}h * R$ ${(salarioBase / 220).toFixed(4)} * ${(1 + (porcentagemExtra/100)).toFixed(2)} multiplicador\n` +
            `    Subtotal Arredondado: R$ ${valorExtras.toFixed(2)}\n\n` +
            `[2] APURAÇÃO DE ATRASOS E FALTAS\n` +
            `    Totais no Relógio: ${decimalToTime(totaisGerais.atrasos)}\n` +
            `    Fração Centesimal Exata: ${formatDecExato(totaisGerais.atrasos).toFixed(4)}h\n` +
            `    Fórmula: ${formatDecExato(totaisGerais.atrasos).toFixed(4)}h * R$ ${(salarioBase / 220).toFixed(4)}\n` +
            `    Subtotal Arredondado: R$ ${valorAtrasos.toFixed(2)}\n\n` +
            `[3] APURAÇÃO DE DSR (Descanso Semanal Remunerado)\n` +
            `    Fórmula Base Simplificada 6x1 (1/6): Somatório Variáveis(Extras, Noturnas) * 1/6\n` +
            `    Subtotal Arredondado: R$ ${valorDSR.toFixed(2)}\n\n` +
            `* Nota de Arredondamento BR: Valores arredondados na 2ª casa decimal (Corte direto). Soma-se +1 apenas se a 3ª casa do centavo for superior a 6 (ex: 1,047 vira 1,05).`;

        setMemorialText(mem);
        setProventosList(initialProventos);
        setDescontosList(initialDescontos);
        
        setIsPreviewOpen(true);
    };

    const handleUpdateVerba = (type: 'proventos' | 'descontos', id: string, field: 'desc' | 'valor', val: any) => {
        const updater = type === 'proventos' ? setProventosList : setDescontosList;
        updater(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
    };

    const handleRemoveVerba = (type: 'proventos' | 'descontos', id: string) => {
        const updater = type === 'proventos' ? setProventosList : setDescontosList;
        updater(prev => prev.filter(item => item.id !== id));
    };

    const handleAddVerba = (type: 'proventos' | 'descontos') => {
        const updater = type === 'proventos' ? setProventosList : setDescontosList;
        updater(prev => [...prev, { id: `nova_${Date.now()}`, desc: `NOVA VERBA`, valor: 0.0 }]);
    };

    const handleGeneratePDF = () => {
        const funcionario = funcionarios.find(f => f.id === selectedFuncId);
        if (!funcionario) return;

        const totalProventos = proventosList.reduce((acc, p) => acc + p.valor, 0);
        const totalDescontos = descontosList.reduce((acc, d) => acc + d.valor, 0);
        const liquido = totalProventos - totalDescontos;

        const doc = new jsPDF();
        const MARGIN = 20;
        let y = 25;

        // Header do Recibo
        doc.setFontSize(16); doc.setFont("helvetica", "bold");
        doc.text(previewTitle, 105, y, { align: "center" });
        doc.setFontSize(12); doc.text(`R$ ${liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, y, { align: "right" });
        
        y += 12;
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        const headSplit = doc.splitTextToSize(previewHeader, 170);
        doc.text(headSplit, MARGIN, y);
        y += (headSplit.length * 5) + 5;
        
        doc.setFont("helvetica", "normal");
        const refSplit = doc.splitTextToSize(previewReference, 170);
        doc.text(refSplit, MARGIN, y);
        y += (refSplit.length * 5) + 5;

        doc.setFont("helvetica", "bold"); doc.text("DISCRIMINAÇÃO DAS VERBAS", MARGIN, y);
        y += 2; doc.line(MARGIN, y, 190, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        [...proventosList, ...descontosList.map(d => ({ ...d, valor: -d.valor }))].forEach(item => {
            doc.text(item.desc, MARGIN, y);
            doc.text(`R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, y, { align: "right" });
            y += 6;
        });

        y += 4; doc.line(MARGIN, y, 190, y); y += 6;
        doc.setFont("helvetica", "bold");
        doc.text("VALOR LÍQUIDO A RECEBER", MARGIN, y);
        doc.text(`R$ ${liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, y, { align: "right" });

        y += 15;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        const declSplit = doc.splitTextToSize(previewFooter, 170);
        doc.text(declSplit, MARGIN, y);

        y += 25;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`${empresa.endereco?.cidade || "Cidade"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, MARGIN, y);
        
        y += 20;
        doc.line(70, y, 140, y);
        doc.text(funcionario.nome.toUpperCase(), 105, y+5, { align: "center" });

        doc.save(`Recibo_Ponto_${funcionario.nome.split(' ')[0]}.pdf`);
        toast.success("Recibo gerado com sucesso!");
        setIsPreviewOpen(false);
    };

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-muted/30 p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                        <Calendar className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-card-foreground">Folha de Ponto Manual</h3>
                        <p className="text-sm text-muted-foreground">Preencha as batidas diárias para cálculo automático</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handlePreencherPadrao} className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex items-center gap-2">
                        <Zap size={14} className="text-amber-500" /> Preencher Padrão
                    </button>
                    <button onClick={() => setRegistros({})} className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all flex items-center gap-2">
                        <RotateCcw size={14} /> Limpar
                    </button>
                </div>
            </div>

            {/* Configs */}
            <div className="p-5 flex flex-wrap gap-x-6 gap-y-4 bg-muted/10 border-b border-border shadow-inner items-start">
                <div className="space-y-1.5 w-full sm:w-[240px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Funcionário</label>
                    <select value={selectedFuncId} onChange={e => setSelectedFuncId(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm shadow-sm transition-colors focus:border-indigo-500">
                        <option value="">Selecione...</option>
                        {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                </div>
                
                <div className="space-y-1.5 shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Período de Referência</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-[130px] px-3 py-2 border border-border rounded-xl bg-background text-sm shadow-sm transition-colors focus:border-indigo-500" />
                        <span className="text-muted-foreground font-medium text-xs">à</span>
                        <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-[130px] px-3 py-2 border border-border rounded-xl bg-background text-sm shadow-sm transition-colors focus:border-indigo-500" />
                    </div>
                </div>

                <div className="space-y-1.5 w-[140px] shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Salário (R$)</label>
                    <input type="number" placeholder="Salário Base" value={salarioBase || ""} onChange={e => setSalarioBase(Number(e.target.value))} className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm font-medium shadow-sm transition-colors focus:border-indigo-500" />
                </div>
                
                <div className="space-y-1.5 w-full sm:w-[320px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Horário Padrão (M/T)</label>
                    <div className="grid grid-cols-4 gap-1">
                        <input type="text" placeholder="Entrada" value={padraoE1} onChange={e => setPadraoE1(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs text-center font-mono focus:border-indigo-500 shadow-sm transition-colors" />
                        <input type="text" placeholder="Saída" value={padraoS1} onChange={e => setPadraoS1(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs text-center font-mono focus:border-indigo-500 shadow-sm transition-colors" />
                        <input type="text" placeholder="Entrada" value={padraoE2} onChange={e => setPadraoE2(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs text-center font-mono focus:border-indigo-500 shadow-sm transition-colors" />
                        <input type="text" placeholder="Saída" value={padraoS2} onChange={e => setPadraoS2(e.target.value)} className="w-full px-2 py-2 border border-border rounded-lg bg-background text-xs text-center font-mono focus:border-indigo-500 shadow-sm transition-colors" />
                    </div>
                </div>

                <div className="space-y-1.5 w-[120px] shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Escala</label>
                    <select value={escala} onChange={e => setEscala(e.target.value)} className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm cursor-pointer shadow-sm transition-colors focus:border-indigo-500">
                        <option value="6x1">6x1</option>
                        <option value="5x2">5x2</option>
                        <option value="Outra">Outra</option>
                    </select>
                </div>

                <div className="space-y-1.5 flex-1 min-w-[200px] flex flex-col justify-end pt-[2px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Opções de Cálculo</label>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={compensarAtrasos} onChange={e => setCompensarAtrasos(e.target.checked)} className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-0 shadow-sm" />
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">Compensar Atrasos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={calcularDSR} onChange={e => setCalcularDSR(e.target.checked)} className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-0 shadow-sm" />
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">DSR</span>
                        </label>
                        <div className="flex items-center gap-2 px-2 py-0.5 border border-border/50 rounded-lg bg-background shadow-sm ml-auto">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">% Extra:</span>
                            <div className="flex items-center px-1">
                                <input type="number" value={porcentagemExtra} onChange={e => setPorcentagemExtra(Number(e.target.value))} className="w-12 h-6 text-xs text-right bg-transparent border-none focus:ring-0 font-mono font-bold text-foreground p-0" />
                                <span className="text-xs font-bold text-muted-foreground ml-1">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="p-0 max-h-[500px] overflow-y-auto relative">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-background z-10 border-b border-border shadow-sm">
                        <tr className="bg-muted/50">
                            <th className="py-3 px-4 text-left font-black text-[10px] uppercase tracking-widest text-muted-foreground w-28">Dia/Data</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">Entrada 1</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">Saída 1</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">Entrada 2</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">Saída 2</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-emerald-600/70">Extra</th>
                            <th className="py-3 px-2 text-center font-black text-[10px] uppercase tracking-widest text-rose-600/70">Atraso</th>
                            <th className="py-3 px-4 text-right font-black text-[10px] uppercase tracking-widest text-indigo-600/70">Horário Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {diasNoPeriodo.map((dia, idx) => {
                            const dateStr = format(dia, "yyyy-MM-dd");
                            const reg = registros[dateStr] || { e1: "", s1: "", e2: "", s2: "" };
                            const res = calculateDayTotals(reg, dia);
                            const weekend = isWeekend(dia);
                            
                            return (
                                <tr key={dateStr} className={`border-b border-border/40 transition-colors hover:bg-muted/20 ${weekend ? "bg-muted/10" : ""}`}>
                                    <td className="py-2 px-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-card-foreground text-xs">{format(dia, "dd/MM")}</span>
                                            <span className={`text-[9px] uppercase font-black ${weekend ? "text-destructive/70" : "text-muted-foreground/60"}`}>
                                                {format(dia, "EEEE", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </td>
                                    {["e1", "s1", "e2", "s2"].map(field => (
                                        <td key={field} className="py-1 px-2 text-center">
                                            <input 
                                                type="text" 
                                                placeholder="--:--" 
                                                value={reg[field as keyof RegistroDiario]} 
                                                onChange={e => handleUpdateRegistro(dateStr, field as keyof RegistroDiario, e.target.value)}
                                                onBlur={e => handleUpdateRegistro(dateStr, field as keyof RegistroDiario, formatTimeInput(e.target.value))}
                                                onPaste={e => handlePaste(e, idx, field as keyof RegistroDiario)}
                                                className="w-14 sm:w-16 h-8 px-0 text-center border border-border/50 rounded-lg bg-background text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none font-medium"
                                            />
                                        </td>
                                    ))}
                                    <td className="py-1 px-2 text-center">
                                        {res.extra > 0 ? <span className="text-emerald-600 font-bold text-xs">{decimalToTime(res.extra)}</span> : <span className="text-muted-foreground/20 text-xs">-</span>}
                                    </td>
                                    <td className="py-1 px-2 text-center">
                                        {res.atraso > 0 ? <span className="text-rose-600 font-bold text-xs">{decimalToTime(res.atraso)}</span> : <span className="text-muted-foreground/20 text-xs">-</span>}
                                    </td>
                                    <td className="py-1 px-4 text-right">
                                        <span className="font-mono text-sm font-black text-indigo-700">{decimalToTime(res.totalWorked)}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Totais Finas */}
            <div className="bg-muted/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border">
                <div className="flex flex-wrap gap-8">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Extras</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-indigo-600">{decimalToTime(totaisGerais.extras)}</span>
                            <span className="text-xs text-muted-foreground">({porcentagemExtra}%)</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Atrasos</p>
                        <span className="text-xl font-black text-rose-600">{decimalToTime(totaisGerais.atrasos)}</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adic. Noturno</p>
                        <span className="text-xl font-black text-amber-600">{decimalToTime(totaisGerais.noturno)}</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Líquido de Variáveis</p>
                        <span className="text-xl font-black text-card-foreground font-mono">
                            R$ {(totaisGerais.valorExtras + totaisGerais.valorNoturno + totaisGerais.valorDSR - totaisGerais.valorAtrasos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={handlePreview}
                    className="w-full md:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest"
                >
                    <Eye size={20} className="text-white/70" /> Visualizar e Editar Recibo
                </button>
            </div>

            {/* Modal de Pré-Visualização / Edição Dinâmica */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto w-full p-0">
                    <div className="bg-muted/10 border-b border-border p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Edit2 className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">Designer de Recibo</DialogTitle>
                            <DialogDescription className="text-sm">Todo o recibo pode ser editado. Altere as tabelas, valores e linhas abaixo do jeito que achar melhor.</DialogDescription>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Title & Header */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Título do Recibo</label>
                                <input type="text" value={previewTitle} onChange={e => setPreviewTitle(e.target.value)} className="w-full mt-1 px-4 py-2 border border-border rounded-xl bg-background text-lg font-black text-center focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Tópico de Introdução (Parte 1)</label>
                                <textarea value={previewHeader} onChange={e => setPreviewHeader(e.target.value)} rows={3} className="w-full mt-1 px-4 py-2 border border-border rounded-xl bg-background text-sm focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Tópico de Referência (Parte 2)</label>
                                <textarea value={previewReference} onChange={e => setPreviewReference(e.target.value)} rows={2} className="w-full mt-1 px-4 py-2 border border-border rounded-xl bg-background text-sm focus:border-indigo-500 transition-colors" />
                            </div>
                        </div>

                        {/* Financial Tables */}
                        <div className="space-y-6 pt-4 border-t border-border">
                            {/* Proventos */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-sm text-card-foreground flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> PROVENTOS (CRÉDITOS)</h4>
                                    <button onClick={() => handleAddVerba('proventos')} className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md"><Plus size={14}/> Nova Linha</button>
                                </div>
                                <div className="space-y-2">
                                    {proventosList.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <input type="text" value={item.desc} onChange={e => handleUpdateVerba('proventos', item.id, 'desc', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-emerald-500" />
                                            <span className="text-emerald-600 font-bold">R$</span>
                                            <input type="number" value={item.valor} onChange={e => handleUpdateVerba('proventos', item.id, 'valor', Number(e.target.value))} className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-sm text-right font-mono focus:border-emerald-500" />
                                            <button onClick={() => handleRemoveVerba('proventos', item.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Descontos */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-sm text-card-foreground flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> DESCONTOS (DÉBITOS)</h4>
                                    <button onClick={() => handleAddVerba('descontos')} className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md"><Plus size={14}/> Nova Linha</button>
                                </div>
                                <div className="space-y-2">
                                    {descontosList.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <input type="text" value={item.desc} onChange={e => handleUpdateVerba('descontos', item.id, 'desc', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:border-rose-500" />
                                            <span className="text-rose-600 font-bold">R$</span>
                                            <input type="number" value={item.valor} onChange={e => handleUpdateVerba('descontos', item.id, 'valor', Number(e.target.value))} className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-sm text-right font-mono focus:border-rose-500" />
                                            <button onClick={() => handleRemoveVerba('descontos', item.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Preview Líquido Dinâmico */}
                            <div className="bg-muted/30 p-4 border border-border rounded-xl flex items-center justify-between">
                                <span className="font-black text-sm uppercase tracking-widest text-muted-foreground">Líquido Final Real em PDF:</span>
                                <span className="text-xl font-black font-mono">
                                    R$ {(proventosList.reduce((acc,p)=>acc+p.valor,0) - descontosList.reduce((acc,d)=>acc+d.valor,0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        
                        {/* Memorial de Calculo */}
                        <div className="space-y-4 pt-4 border-t border-border">
                            <h4 className="font-black text-sm text-card-foreground flex items-center gap-2"><Calculator size={18} className="text-amber-500" /> MEMÓRIA DE CÁLCULO</h4>
                            <div className="bg-[#1e1e1e] p-4 rounded-xl overflow-x-auto shadow-inner border border-border">
                                <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap">{memorialText}</pre>
                            </div>
                        </div>

                        {/* Footer Decl */}
                        <div className="space-y-2 pt-4 border-t border-border">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Declaração de Quitação no Rodapé</label>
                            <textarea value={previewFooter} onChange={e => setPreviewFooter(e.target.value)} rows={3} className="w-full px-4 py-2 border border-border rounded-xl bg-background text-sm focus:border-indigo-500 transition-colors" />
                        </div>
                    </div>
                    
                    <div className="bg-muted/10 p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-sm shadow-t-sm">
                        <button onClick={() => setIsPreviewOpen(false)} className="px-6 py-3 font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors">Voltar para a Grade</button>
                        <button onClick={handleGeneratePDF} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                            <Check size={18} /> CONFIRMAR E BAIXAR PDF
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
