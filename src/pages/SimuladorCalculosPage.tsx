import React, { useState } from "react";
import { Calculator, Calendar, DollarSign, Info, RefreshCw, FileText, Umbrella } from "lucide-react";
import { format, differenceInMonths, differenceInDays, addYears, isBefore, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const SimuladorCalculosPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"rescisao" | "ferias">("rescisao");
    const [salary, setSalary] = useState<number>(0);
    const [admissionDate, setAdmissionDate] = useState<string>("");
    const [rescissionDate, setRescissionDate] = useState<string>("");
    const [type, setType] = useState<string>("sem_justa_causa");
    
    // Férias states
    const [vacationDays, setVacationDays] = useState<number>(30);
    const [hasAbono, setHasAbono] = useState<boolean>(false);
    const [vacationStartDate, setVacationStartDate] = useState<string>("");
    
    const [results, setResults] = useState<any>(null);

    const calculateRescisao = () => {
        if (!salary || !admissionDate || !rescissionDate) return;

        const start = new Date(admissionDate);
        const end = new Date(rescissionDate);
        
        if (isBefore(end, start)) {
            alert("A data de rescisão não pode ser anterior à admissão.");
            return;
        }

        const monthsWorkedTotal = differenceInMonths(end, start);
        const lastMonthStart = addMonths(start, monthsWorkedTotal);
        const daysInLastMonth = differenceInDays(end, lastMonthStart) + 1;

        const salaryBalance = (salary / 30) * Math.min(daysInLastMonth, 30);

        let thirteenthMonths = monthsWorkedTotal % 12;
        if (daysInLastMonth >= 15) thirteenthMonths += 1;
        const thirteenthValue = (type === "com_justa_causa") ? 0 : (salary / 12) * thirteenthMonths;

        let vacationMonths = monthsWorkedTotal % 12;
        if (daysInLastMonth >= 15) vacationMonths += 1;
        const vacationProportional = (type === "com_justa_causa") ? 0 : (salary / 12) * vacationMonths;
        const vacationTerco = vacationProportional / 3;

        const yearsWorked = Math.floor(monthsWorkedTotal / 12);
        let avisoValue = 0;
        let avisoDays = 0;

        if (type === "sem_justa_causa") {
            avisoDays = (30 + (Math.min(yearsWorked, 20) * 3));
            avisoValue = (salary / 30) * avisoDays;
        } else if (type === "acordo") {
            avisoDays = (30 + (Math.min(yearsWorked, 20) * 3)) / 2;
            avisoValue = (salary / 30) * avisoDays;
        }

        const fgtsBase = salary * monthsWorkedTotal;
        const fgtsBalance = fgtsBase * 0.08;
        let fgtsFine = 0;

        if (type === "sem_justa_causa") fgtsFine = fgtsBalance * 0.40;
        else if (type === "acordo") fgtsFine = fgtsBalance * 0.20;

        const total = salaryBalance + thirteenthValue + vacationProportional + vacationTerco + avisoValue + fgtsFine;

        setResults({
            type: 'rescisao',
            salaryBalance,
            daysInLastMonth,
            thirteenthValue,
            thirteenthMonths: (type === "com_justa_causa") ? 0 : thirteenthMonths,
            vacationProportional,
            vacationMonths: (type === "com_justa_causa") ? 0 : vacationMonths,
            vacationTerco,
            avisoDays,
            avisoValue,
            fgtsBalance,
            fgtsFine,
            total
        });
    };

    const calculateFerias = () => {
        if (!salary) return;

        let periodoAquisitivo = "";
        let diasProporcionais = 0;
        let diffMonths = 0;

        if (admissionDate && vacationStartDate) {
            const start = new Date(admissionDate);
            const vacStart = new Date(vacationStartDate);
            
            if (isBefore(vacStart, start)) {
                alert("A data das férias não pode ser anterior à admissão.");
                return;
            }

            const totalMonths = differenceInMonths(vacStart, start);
            const years = Math.floor(totalMonths / 12);
            
            const startOfCurrentPeriod = addYears(start, years);
            const endOfCurrentPeriod = addYears(startOfCurrentPeriod, 1);
            
            periodoAquisitivo = `${format(startOfCurrentPeriod, "dd/MM/yyyy")} a ${format(endOfCurrentPeriod, "dd/MM/yyyy")}`;
            diffMonths = totalMonths % 12;
            diasProporcionais = Math.min(30, diffMonths * 2.5);
        }

        const daysToCalc = hasAbono ? 20 : vacationDays;
        const valueFerias = (salary / 30) * daysToCalc;
        const valueTerco = valueFerias / 3;
        
        let valueAbono = 0;
        let valueTercoAbono = 0;
        
        if (hasAbono) {
            valueAbono = (salary / 30) * 10;
            valueTercoAbono = valueAbono / 3;
        }

        // Simplied INSS (Base on salary + terco)
        const baseInss = valueFerias + valueTerco;
        let inss = 0;
        if (baseInss <= 1412) inss = baseInss * 0.075;
        else if (baseInss <= 2666.68) inss = (baseInss * 0.09) - 21.18;
        else if (baseInss <= 4000.03) inss = (baseInss * 0.12) - 101.18;
        else if (baseInss <= 7786.02) inss = (baseInss * 0.14) - 181.18;
        else inss = 908.85;

        // Simplified IRRF
        const baseIrrf = baseInss - inss;
        let irrf = 0;
        if (baseIrrf <= 2259.20) irrf = 0;
        else if (baseIrrf <= 2826.65) irrf = (baseIrrf * 0.075) - 169.44;
        else if (baseIrrf <= 3751.05) irrf = (baseIrrf * 0.15) - 381.44;
        else if (baseIrrf <= 4664.68) irrf = (baseIrrf * 0.225) - 662.77;
        else irrf = (baseIrrf * 0.275) - 896.00;

        const total = (valueFerias + valueTerco + valueAbono + valueTercoAbono) - (inss + irrf);

        setResults({
            type: 'ferias',
            valueFerias,
            valueTerco,
            valueAbono,
            valueTercoAbono,
            inss,
            irrf,
            total,
            days: daysToCalc,
            periodoAquisitivo,
            diasProporcionais
        });
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">Simulador de Cálculos Trabalhistas</h1>
                        <FavoriteToggleButton moduleId="simulador" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Estime os custos de rescisão e férias (CLT).</p>
                </div>
                
                <div className="flex p-1 bg-muted/50 rounded-2xl border border-border/50 shrink-0">
                    <button 
                        onClick={() => { setActiveTab("rescisao"); setResults(null); }}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "rescisao" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Rescisão
                    </button>
                    <button 
                        onClick={() => { setActiveTab("ferias"); setResults(null); }}
                        className={`px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === "ferias" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Férias
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="module-card">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            {activeTab === 'rescisao' ? <Calculator size={20} className="text-primary" /> : <Umbrella size={20} className="text-primary" />} 
                            Parâmetros
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Salário Base (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">R$</span>
                                    <input 
                                        type="number" 
                                        value={salary || ""} 
                                        onChange={e => setSalary(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all font-bold"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            {activeTab === 'rescisao' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Data de Admissão</label>
                                        <input 
                                            type="date" 
                                            value={admissionDate} 
                                            onChange={e => setAdmissionDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Data de Rescisão</label>
                                        <input 
                                            type="date" 
                                            value={rescissionDate} 
                                            onChange={e => setRescissionDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Motivo da Saída</label>
                                        <select 
                                            value={type} 
                                            onChange={e => setType(e.target.value)}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                        >
                                            <option value="sem_justa_causa">Dispensa sem Justa Causa</option>
                                            <option value="com_justa_causa">Dispensa com Justa Causa</option>
                                            <option value="pedido_demissao">Pedido de Demissão</option>
                                            <option value="acordo">Acordo (Reforma Trabalhista)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Data de Admissão</label>
                                        <input 
                                            type="date" 
                                            value={admissionDate} 
                                            onChange={e => setAdmissionDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Início das Férias</label>
                                        <input 
                                            type="date" 
                                            value={vacationStartDate} 
                                            onChange={e => setVacationStartDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Dias de Gozo</label>
                                        <select 
                                            value={vacationDays} 
                                            onChange={e => setVacationDays(parseInt(e.target.value))}
                                            className="w-full px-4 py-3 border border-border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary transition-all"
                                            disabled={hasAbono}
                                        >
                                            <option value={30}>30 dias</option>
                                            <option value={20}>20 dias</option>
                                            <option value={15}>15 dias</option>
                                            <option value={10}>10 dias</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-xl">
                                        <input 
                                            type="checkbox" 
                                            id="abono"
                                            checked={hasAbono}
                                            onChange={e => setHasAbono(e.target.checked)}
                                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="abono" className="text-xs font-bold text-foreground cursor-pointer select-none">Vender 10 dias (Abono Pecuniário)</label>
                                    </div>
                                </>
                            )}

                            <button 
                                onClick={activeTab === 'rescisao' ? calculateRescisao : calculateFerias}
                                className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} /> Calcular Simulação
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {!results ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-muted/20 border-2 border-dashed border-border rounded-[2rem]">
                            <Calculator size={64} className="text-muted-foreground opacity-10 mb-6" />
                            <h3 className="text-xl font-bold text-muted-foreground">Pronto para Calcular</h3>
                            <p className="max-w-xs text-sm text-muted-foreground mt-2">Preencha os dados ao lado para ver a estimativa de verbas {activeTab === 'rescisao' ? 'rescisórias' : 'de férias'}.</p>
                        </div>
                    ) : (
                        <div className="module-card bg-gradient-to-br from-card to-muted/30 animate-in zoom-in-95 duration-500">
                            <h2 className="text-xl font-black mb-8 border-b border-border pb-4 flex items-center gap-2">
                                <DollarSign size={24} className="text-green-500" /> Resultado da Simulação
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                                            {results.type === 'rescisao' ? 'Verbas Rescisórias' : 'Verbas de Férias'}
                                        </h3>
                                        <div className="space-y-3">
                                            {results.type === 'rescisao' ? (
                                                <>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">Saldo de Salário ({results.daysInLastMonth} dias)</span>
                                                        <span className="font-bold">{formatCurrency(results.salaryBalance)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">13º Proporcional ({results.thirteenthMonths}/12)</span>
                                                        <span className="font-bold">{formatCurrency(results.thirteenthValue)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">Férias Prop. ({results.vacationMonths}/12)</span>
                                                        <span className="font-bold">{formatCurrency(results.vacationProportional)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">1/3 Constitucional sobre Férias</span>
                                                        <span className="font-bold">{formatCurrency(results.vacationTerco)}</span>
                                                    </div>
                                                    {results.avisoValue > 0 && (
                                                        <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                            <span className="text-sm font-medium">Aviso Prévio Indenizado ({Math.floor(results.avisoDays)} dias)</span>
                                                            <span className="font-bold">{formatCurrency(results.avisoValue)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">Férias ({results.days} dias)</span>
                                                        <span className="font-bold">{formatCurrency(results.valueFerias)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">1/3 Constitucional</span>
                                                        <span className="font-bold">{formatCurrency(results.valueTerco)}</span>
                                                    </div>
                                                    {results.valueAbono > 0 && (
                                                        <>
                                                            <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                                <span className="text-sm font-medium">Abono Pecuniário (10 dias)</span>
                                                                <span className="font-bold">{formatCurrency(results.valueAbono)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                                <span className="text-sm font-medium">1/3 sobre Abono</span>
                                                                <span className="font-bold">{formatCurrency(results.valueTercoAbono)}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    {results.periodoAquisitivo && (
                                                         <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mt-4">
                                                             <p className="text-[10px] font-black uppercase text-primary mb-1">Período Aquisitivo</p>
                                                             <p className="text-xs font-bold text-foreground">{results.periodoAquisitivo}</p>
                                                             <p className="text-[10px] text-muted-foreground mt-1">Saldo Proporcional: {Math.floor(results.diasProporcionais)} dias</p>
                                                         </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                                            {results.type === 'rescisao' ? 'Indenizações & FGTS' : 'Descontos Estimados'}
                                        </h3>
                                        <div className="space-y-3">
                                            {results.type === 'rescisao' ? (
                                                <>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/40">
                                                        <span className="text-sm font-medium">Saldo FGTS (Saque)</span>
                                                        <span className="font-bold">{type === "com_justa_causa" || type === "pedido_demissao" ? "Bloqueado" : formatCurrency(results.fgtsBalance)}</span>
                                                    </div>
                                                    {results.fgtsFine > 0 && (
                                                        <div className="flex justify-between items-center p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                                                            <span className="text-sm font-bold text-amber-600">Multa FGTS ({type === "acordo" ? "20%" : "40%"})</span>
                                                            <span className="font-bold text-amber-600">{formatCurrency(results.fgtsFine)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-red-500/10 text-red-500">
                                                        <span className="text-sm font-medium">INSS Estimado</span>
                                                        <span className="font-bold">-{formatCurrency(results.inss)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-red-500/10 text-red-500">
                                                        <span className="text-sm font-medium">IRRF Estimado</span>
                                                        <span className="font-bold">-{formatCurrency(results.irrf)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto p-6 bg-primary rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                                            {results.type === 'rescisao' ? 'Total Estimado Bruto' : 'Total Líquido Estimado'}
                                        </p>
                                        <p className="text-3xl font-black">{formatCurrency(results.total)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 p-5 bg-primary/5 border border-primary/20 rounded-2xl flex gap-4">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                                    <Info size={24} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-primary uppercase tracking-wider italic">Aviso Importante</p>
                                    <p className="text-[11px] text-primary/80 leading-relaxed italic">
                                        Esta é uma simulação simplificada e não substitui o cálculo oficial do sistema de folha ou do Ministério do Trabalho. 
                                        {results.type === 'rescisao' ? ' Não estão inclusos descontos de INSS, IRRF, faltas ou horas extras.' : ' Os descontos de INSS e IRRF são baseados em tabelas vigentes aproximadas.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SimuladorCalculosPage;
