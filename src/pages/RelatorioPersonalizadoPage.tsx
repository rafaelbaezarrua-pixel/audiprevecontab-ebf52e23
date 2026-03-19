import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Download, Calendar, Building2,
    CheckCircle2, Circle, ChevronRight,
    Filter, Layers, ListChecks,
    FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { 
    MODULES_CONFIG, SITUATIONS, COMPANY_FIELDS, 
    DEFAULT_HEADER 
} from "@/constants/reports";
import { useReportGenerator } from "@/hooks/useReportGenerator";
import { ModuleCard } from "@/components/reports/ModuleCard";

const RelatorioPersonalizadoPage: React.FC = () => {
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
    const [selectedCompanyFields, setSelectedCompanyFields] = useState<string[]>(["cnpj", "regime_tributario"]);
    const [selectedSituations, setSelectedSituations] = useState<string[]>(["ativa", "mei", "paralisada", "baixada", "entregue"]);
    const [headerConfig, setHeaderConfig] = useState<any>(null);

    const { loadingType, generateReport } = useReportGenerator();

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

    const toggleSituation = (id: string) => {
        const lowerId = id.toLowerCase();
        if (selectedSituations.includes(lowerId)) {
            if (selectedSituations.length > 1) {
                setSelectedSituations(prev => prev.filter(s => s !== lowerId));
            } else {
                toast.error("Selecione pelo menos uma situação");
            }
        } else {
            setSelectedSituations(prev => [...prev, lowerId]);
        }
    };

    const handleAction = (format: 'pdf' | 'excel') => {
        generateReport(
            competencia,
            selectedModules,
            selectedFields,
            selectedCompanyFields,
            selectedSituations,
            headerConfig || DEFAULT_HEADER,
            format
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header Area */}
            <div className="bg-card rounded-[2rem] border border-border/50 shadow-sm shadow-primary/5 overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-card-foreground tracking-tight">Central de Relatórios</h1>
                            <p className="text-muted-foreground text-sm">Configure e exporte documentos personalizados</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden md:flex flex-col items-end px-4 border-r border-border/50">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status da Seleção</span>
                                <span className="text-sm font-bold text-primary">
                                    {selectedModules.length} {selectedModules.length === 1 ? "módulo selecionado" : "módulos selecionados"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAction('excel')}
                                    disabled={loadingType !== null || selectedModules.length === 0}
                                    className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-sm ${loadingType !== null || selectedModules.length === 0
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                            : "bg-surface text-foreground border border-border/50 hover:bg-muted active:scale-95"
                                        }`}
                                >
                                    {loadingType === 'excel' ? (
                                        <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <FileSpreadsheet size={18} className="text-emerald-600" />
                                    )}
                                    <span>{loadingType === 'excel' ? "Gerando..." : "Excel"}</span>
                                </button>

                                <button
                                    onClick={() => handleAction('pdf')}
                                    disabled={loadingType !== null || selectedModules.length === 0}
                                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${loadingType !== null || selectedModules.length === 0
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                            : "bg-primary text-white shadow-primary/20 hover:scale-105"
                                        }`}
                                >
                                    {loadingType === 'pdf' ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Download size={18} />
                                    )}
                                    <span>{loadingType === 'pdf' ? "Gerando..." : "PDF"}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/40">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Filter size={14} className="text-primary" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filtrar Empresas por Situação</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {SITUATIONS.map(sit => (
                                    <button
                                        key={sit.id}
                                        onClick={() => toggleSituation(sit.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedSituations.includes(sit.id.toLowerCase())
                                                ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                                                : "bg-background/50 border-border/40 text-muted-foreground hover:border-primary/20"
                                            }`}
                                    >
                                        {sit.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                                <Calendar size={14} className="text-primary" />
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Período de Referência</span>
                            </div>
                            <div className="flex items-center w-full max-w-sm">
                                <div className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-border/40 shadow-inner w-full group focus-within:border-primary/40 transition-colors">
                                    <input
                                        type="month"
                                        value={competencia}
                                        onChange={(e) => setCompetencia(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold outline-none focus:ring-0 w-full"
                                    />
                                    <ChevronRight size={16} className="text-muted-foreground/30" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 mb-6">
                            <Layers className="text-primary" size={20} />
                            <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Departamentos</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {MODULES_CONFIG.map(mod => (
                                <ModuleCard 
                                    key={mod.id}
                                    module={mod}
                                    isSelected={selectedModules.includes(mod.id)}
                                    onToggle={toggleModule}
                                />
                            ))}
                        </div>
                    </div>
                </div>

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
                        <div className="space-y-6 animate-scale-in">
                            <div className="bg-card rounded-3xl border border-primary/20 shadow-sm p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <h3 className="font-black text-card-foreground text-lg mb-4 flex items-center gap-2 relative z-10">
                                    <Building2 size={20} className="text-primary" /> Informações da Empresa
                                </h3>
                                <p className="text-xs text-muted-foreground mb-6 max-w-md relative z-10">
                                    Estes campos serão adicionados como colunas para todos os módulos selecionados abaixo.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
                                    {COMPANY_FIELDS.map(field => (
                                        <button
                                            key={field.id}
                                            onClick={() => setSelectedCompanyFields(prev =>
                                                prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id]
                                            )}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedCompanyFields.includes(field.id)
                                                    ? "border-primary/40 bg-primary/5 shadow-sm"
                                                    : "border-border/60 bg-background/50 text-muted-foreground hover:border-primary/20"
                                                }`}
                                        >
                                            <div className={`transition-colors ${selectedCompanyFields.includes(field.id) ? "text-primary" : "text-muted-foreground/40"}`}>
                                                {selectedCompanyFields.includes(field.id) ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </div>
                                            <span className="text-xs font-bold">{field.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedModules.map(modId => {
                                const mod = MODULES_CONFIG.find(m => m.id === modId)!;
                                return (
                                    <div key={modId} className="bg-card rounded-3xl border border-border/50 shadow-sm">
                                        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${mod.color} text-white`}>
                                                    {mod.icon}
                                                </div>
                                                <h3 className="font-black text-card-foreground text-lg">{mod.label}</h3>
                                            </div>
                                            <button
                                                onClick={() => toggleModule(modId)}
                                                className="text-xs font-bold text-destructive hover:opacity-80 px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors self-start sm:self-auto"
                                            >
                                                Remover módulo
                                            </button>
                                        </div>

                                        <div className="p-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                                {mod.fields
                                                    .filter(f => !["tipo", "status", "data", "status_taxa", "data_envio", "forma_envio"].includes(f.id))
                                                    .map(field => (
                                                        <button
                                                            key={field.id}
                                                            onClick={() => toggleField(modId, field.id)}
                                                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${selectedFields[modId]?.includes(field.id)
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
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelatorioPersonalizadoPage;
