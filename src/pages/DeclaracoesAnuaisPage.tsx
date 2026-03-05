import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    ClipboardList, Search, Calendar, CheckCircle,
    Circle, Save, Filter, Users, Building2,
    AlertCircle, Info
} from "lucide-react";
import { toast } from "sonner";

interface Empresa {
    id: string;
    nome_empresa: string;
    cnpj: string | null;
    regime_tributario: string | null;
    porte_empresa: string | null;
    situacao: string | null;
}

interface Socio {
    id: string;
    nome: string;
    cpf: string | null;
    empresa_id: string;
    empresa_nome?: string;
}

interface DeclaracaoAnual {
    id?: string;
    empresa_id: string;
    ano: number;
    tipo_declaracao: string;
    obrigatorio: boolean;
    enviada: boolean;
    data_envio: string | null;
}

interface DeclaracaoIRPF {
    id?: string;
    socio_id: string;
    ano: number;
    faz_pelo_escritorio: boolean;
    transmitida: boolean;
    data_transmissao: string | null;
    quem_transmitiu: string | null;
}

const DeclaracoesAnuaisPage: React.FC = () => {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [socios, setSocios] = useState<Socio[]>([]);
    const [declaracoes, setDeclaracoes] = useState<Record<string, DeclaracaoAnual>>({});
    const [declaracoesIRPF, setDeclaracoesIRPF] = useState<Record<string, DeclaracaoIRPF>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [ano, setAno] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<"defis" | "ecd_ecf" | "dasn_simei" | "dirf" | "irpf">("defis");

    const prazos: Record<string, string> = {
        defis: "31/03",
        ecd_ecf: "31/07",
        dasn_simei: "31/05",
        dirf: "27/02",
        irpf: "31/05"
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: emps } = await supabase.from("empresas").select("*").order("nome_empresa");
            setEmpresas(emps || []);

            const { data: socs } = await supabase.from("socios").select("*, empresas(nome_empresa)");
            setSocios((socs || []).map((s: any) => ({
                ...s,
                empresa_nome: s.empresas?.nome_empresa
            })));

            const { data: decls } = await (supabase.from("declaracoes_anuais" as any) as any).select("*").eq("ano", ano);
            const declMap: Record<string, DeclaracaoAnual> = {};
            (decls as any[])?.forEach(d => {
                declMap[`${d.empresa_id}_${d.tipo_declaracao}`] = d;
            });
            setDeclaracoes(declMap);

            const { data: irpfs } = await (supabase.from("declaracoes_irpf" as any) as any).select("*").eq("ano", ano);
            const irpfMap: Record<string, DeclaracaoIRPF> = {};
            (irpfs as any[])?.forEach(i => {
                irpfMap[i.socio_id] = i;
            });
            setDeclaracoesIRPF(irpfMap);
        } catch (err: any) {
            toast.error("Erro ao carregar dados: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [ano]);

    const handleToggleObrigatorio = (empresaId: string, tipo: string) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: false,
            enviada: false,
            data_envio: null
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: { ...current, obrigatorio: !current.obrigatorio }
        }));
    };

    const handleToggleEnviada = (empresaId: string, tipo: string) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: true,
            enviada: false,
            data_envio: null
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: {
                ...current,
                enviada: !current.enviada,
                data_envio: !current.enviada ? new Date().toISOString().split('T')[0] : null
            }
        }));
    };

    const updateDeclaracao = (empresaId: string, tipo: string, field: string, value: any) => {
        const key = `${empresaId}_${tipo}`;
        const current = declaracoes[key] || {
            empresa_id: empresaId,
            ano,
            tipo_declaracao: tipo,
            obrigatorio: true,
            enviada: false,
            data_envio: null
        };

        setDeclaracoes(prev => ({
            ...prev,
            [key]: { ...current, [field]: value }
        }));
    };

    const saveDeclaracao = async (empresaId: string, tipo: string) => {
        setSaving(true);
        const key = `${empresaId}_${tipo}`;
        const data = declaracoes[key];
        if (!data) return;

        try {
            if (data.id) {
                await (supabase.from("declaracoes_anuais" as any) as any).update({
                    obrigatorio: data.obrigatorio,
                    enviada: data.enviada,
                    data_envio: data.data_envio
                }).eq("id", data.id);
            } else {
                const { data: inserted } = await (supabase.from("declaracoes_anuais" as any) as any).insert(data).select().single();
                if (inserted) {
                    setDeclaracoes(prev => ({ ...prev, [key]: inserted as DeclaracaoAnual }));
                }
            }
            toast.success("Declaração salva!");
        } catch (err: any) {
            toast.error("Erro ao salvar: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // IRPF handlers
    const updateIRPF = (socioId: string, field: string, value: any) => {
        const current = declaracoesIRPF[socioId] || {
            socio_id: socioId,
            ano,
            faz_pelo_escritorio: false,
            transmitida: false,
            data_transmissao: null,
            quem_transmitiu: null
        };

        setDeclaracoesIRPF(prev => ({
            ...prev,
            [socioId]: { ...current, [field]: value }
        }));
    };

    const saveIRPF = async (socioId: string) => {
        setSaving(true);
        const data = declaracoesIRPF[socioId];
        if (!data) return;

        try {
            if (data.id) {
                await (supabase.from("declaracoes_irpf" as any) as any).update({
                    faz_pelo_escritorio: data.faz_pelo_escritorio,
                    transmitida: data.transmitida,
                    data_transmissao: data.data_transmissao,
                    quem_transmitiu: data.quem_transmitiu
                }).eq("id", data.id);
            } else {
                const { data: inserted } = await (supabase.from("declaracoes_irpf" as any) as any).insert(data).select().single();
                if (inserted) {
                    setDeclaracoesIRPF(prev => ({ ...prev, [socioId]: inserted as DeclaracaoIRPF }));
                }
            }
            toast.success("IRPF salvo!");
        } catch (err: any) {
            toast.error("Erro ao salvar IRPF: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const filterCompanies = () => {
        return empresas.filter(e => {
            const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

            let matchTab = false;
            if (activeTab === "defis") {
                matchTab = e.regime_tributario === "simples";
            } else if (activeTab === "ecd_ecf") {
                matchTab = e.regime_tributario === "lucro_presumido" || e.regime_tributario === "lucro_real";
            } else if (activeTab === "dasn_simei") {
                matchTab = e.porte_empresa === "mei";
            } else if (activeTab === "dirf") {
                matchTab = e.porte_empresa !== "mei";
            } else {
                matchTab = true; // For IRPF we list socios
            }

            // Check for manual override (obrigatorio)
            const key = `${e.id}_${activeTab}`;
            const decl = declaracoes[key];
            if (decl?.obrigatorio) matchTab = true;

            return matchSearch && matchTab;
        });
    };

    const filterSocios = () => {
        return socios.filter(s =>
            s.nome.toLowerCase().includes(search.toLowerCase()) ||
            (s.cpf && s.cpf.includes(search)) ||
            (s.empresa_nome && s.empresa_nome.toLowerCase().includes(search.toLowerCase()))
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    const filteredItems = activeTab === "irpf" ? filterSocios() : filterCompanies();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-card-foreground">Declarações Anuais</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Controle de obrigações anuais e IRPF</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground uppercase">Ano Base:</span>
                    <select
                        value={ano}
                        onChange={e => setAno(parseInt(e.target.value))}
                        className="px-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-bold shadow-sm"
                    >
                        {[...Array(10)].map((_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return <option key={year} value={year}>{year}</option>;
                        })}
                    </select>
                </div>
            </div>

            <div className="module-card">
                <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                    <div className="relative flex-1 w-full">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={activeTab === "irpf" ? "Buscar por nome, CPF ou empresa..." : "Buscar por nome ou CNPJ..."}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: "defis", label: "DEFIS" },
                            { id: "ecd_ecf", label: "ECD/ECF" },
                            { id: "dasn_simei", label: "DASN-SIMEI" },
                            { id: "dirf", label: "DIRF" },
                            { id: "irpf", label: "IRPF" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-info/10 border border-info/20 rounded-xl p-4 mb-6 flex gap-3 items-start">
                    <Info size={18} className="text-info mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-info">
                        <p className="font-semibold">Obrigação para {prazos[activeTab]}:</p>
                        {activeTab === "defis" && <p>Automatizado para empresas do Simples Nacional.</p>}
                        {activeTab === "ecd_ecf" && <p>Automatizado para empresas de Lucro Real ou Presumido.</p>}
                        {activeTab === "dasn_simei" && <p>Automatizado para empresas MEI.</p>}
                        {activeTab === "dirf" && <p>Todas as empresas, exceto MEI.</p>}
                        {activeTab === "irpf" && <p>Lista de sócios ativos no Societário.</p>}
                        <p className="text-xs opacity-80 mt-1">Você pode marcar/desmarcar a obrigatoriedade manualmente para cada empresa.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {activeTab !== "irpf" ? (
                        // Empresas List
                        (filteredItems as Empresa[]).map(emp => {
                            const key = `${emp.id}_${activeTab}`;
                            // Lógica de obrigatoriedade automática
                            const isAutoObligatory =
                                (activeTab === "defis" && emp.regime_tributario === "simples") ||
                                (activeTab === "ecd_ecf" && (emp.regime_tributario === "lucro_presumido" || emp.regime_tributario === "lucro_real")) ||
                                (activeTab === "dasn_simei" && emp.porte_empresa === "mei") ||
                                (activeTab === "dirf" && emp.porte_empresa !== "mei");

                            const decl = declaracoes[key] || {
                                empresa_id: emp.id,
                                ano,
                                tipo_declaracao: activeTab,
                                obrigatorio: isAutoObligatory,
                                enviada: false,
                                data_envio: null
                            };

                            return (
                                <div key={emp.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${decl.obrigatorio ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-card-foreground">{emp.nome_empresa}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {emp.cnpj || "—"} •
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${decl.obrigatorio ? "bg-info/20 text-info" : "bg-muted text-muted-foreground"}`}>
                                                        {decl.obrigatorio ? "Obrigatória" : "Não Obrigatória"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                                            {/* Obrigação Manual */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={decl.obrigatorio}
                                                    onChange={() => handleToggleObrigatorio(emp.id, activeTab)}
                                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-medium">Obrigatória</span>
                                            </label>

                                            {/* Enviada */}
                                            <label className={`flex items-center gap-2 cursor-pointer ${!decl.obrigatorio ? "opacity-30 pointer-events-none" : ""}`}>
                                                <input
                                                    type="checkbox"
                                                    disabled={!decl.obrigatorio}
                                                    checked={decl.enviada}
                                                    onChange={() => handleToggleEnviada(emp.id, activeTab)}
                                                    className="w-4 h-4 rounded border-border text-success focus:ring-success"
                                                />
                                                <span className="text-sm font-medium">Enviada</span>
                                            </label>

                                            {/* Data de Envio */}
                                            <div className={!decl.obrigatorio ? "opacity-30 pointer-events-none" : ""}>
                                                <input
                                                    type="date"
                                                    disabled={!decl.obrigatorio}
                                                    value={decl.data_envio || ""}
                                                    onChange={e => updateDeclaracao(emp.id, activeTab, "data_envio", e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-xs"
                                                />
                                            </div>

                                            {/* Botão Salvar */}
                                            <button
                                                onClick={() => saveDeclaracao(emp.id, activeTab)}
                                                disabled={saving}
                                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                            >
                                                <Save size={14} /> Salvar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        // IRPF List
                        (filteredItems as Socio[]).map(socio => {
                            const decl = declaracoesIRPF[socio.id] || {
                                socio_id: socio.id,
                                ano,
                                faz_pelo_escritorio: false,
                                transmitida: false,
                                data_transmissao: null,
                                quem_transmitiu: null
                            };

                            return (
                                <div key={socio.id} className="p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow">
                                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-card-foreground">{socio.nome}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    CPF: {socio.cpf || "—"} • Empresa: {socio.empresa_nome || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-center gap-3">
                                            {/* Pelo Escritório */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={decl.faz_pelo_escritorio}
                                                    onChange={e => updateIRPF(socio.id, "faz_pelo_escritorio", e.target.checked)}
                                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                                />
                                                <span className="text-xs font-medium">Pelo Escritório?</span>
                                            </label>

                                            {/* Transmitida */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={decl.transmitida}
                                                    onChange={e => updateIRPF(socio.id, "transmitida", e.target.checked)}
                                                    className="w-4 h-4 rounded border-border text-success focus:ring-success"
                                                />
                                                <span className="text-xs font-medium">Transmitida?</span>
                                            </label>

                                            {/* Data Transmissão */}
                                            <div>
                                                <input
                                                    type="date"
                                                    value={decl.data_transmissao || ""}
                                                    onChange={e => updateIRPF(socio.id, "data_transmissao", e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-xs"
                                                />
                                            </div>

                                            {/* Quem Transmitiu */}
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Quem transmitiu?"
                                                    value={decl.quem_transmitiu || ""}
                                                    onChange={e => updateIRPF(socio.id, "quem_transmitiu", e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-xs"
                                                />
                                            </div>

                                            {/* Botão Salvar */}
                                            <button
                                                onClick={() => saveIRPF(socio.id)}
                                                disabled={saving}
                                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                            >
                                                <Save size={14} /> Salvar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {filteredItems.length === 0 && (
                        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                            <ClipboardList size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground font-medium">Nenhum registro encontrado para esta categoria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeclaracoesAnuaisPage;
