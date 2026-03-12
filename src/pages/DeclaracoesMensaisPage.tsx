import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Save, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";

const DeclaracoesMensaisPage: React.FC = () => {
    // We use "pessoal" here to ensure the user has access to edit this, 
    // or we could use a new module permission if declared.
    const { empresas, loading } = useEmpresas("declaracoes_mensais");
    const [pessoalData, setPessoalData] = useState<Record<string, any>>({});
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from("pessoal").select("*").eq("competencia", competencia);
            const map: Record<string, any> = {};
            const formMap: Record<string, any> = {};

            data?.forEach(p => {
                map[p.empresa_id] = p;
                formMap[p.empresa_id] = {
                    dctf_web_gerada: p.dctf_web_gerada || false,
                    dctf_web_data_envio: (p as any).dctf_web_data_envio || ""
                };
            });

            setPessoalData(map);
            setEditForm(formMap);
        };
        load();
    }, [competencia]);

    const filtered = empresas.filter(e => {
        const matchSearch = e.nome_empresa?.toLowerCase().includes(search.toLowerCase()) || e.cnpj?.includes(search);

        let matchTab = false;
        if (activeTab === "ativas") {
            matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa !== "mei";
        } else if (activeTab === "mei") {
            matchTab = (!e.situacao || e.situacao === "ativa") && e.porte_empresa === "mei";
        } else if (activeTab === "paralisadas") {
            matchTab = e.situacao === "paralisada";
        } else if (activeTab === "baixadas") {
            matchTab = e.situacao === "baixada";
        } else if (activeTab === "entregue") {
            matchTab = e.situacao === "entregue";
        }

        return matchSearch && matchTab;
    });

    const updateForm = (empresaId: string, field: string, value: any) => {
        setEditForm(prev => ({
            ...prev,
            [empresaId]: {
                ...prev[empresaId],
                [field]: value
            }
        }));
    };

    const handleSave = async (empresaId: string) => {
        const form = editForm[empresaId] || {};
        const existing = pessoalData[empresaId];
        setIsSaving(true);

        try {
            const payload = {
                empresa_id: empresaId,
                competencia,
                dctf_web_gerada: form.dctf_web_gerada || false,
                dctf_web_data_envio: form.dctf_web_data_envio || null
            };

            if (existing?.id) {
                // Update only the specific fields so we don't overwrite other data from Pessoal
                await supabase.from("pessoal").update({
                    dctf_web_gerada: payload.dctf_web_gerada,
                    dctf_web_data_envio: payload.dctf_web_data_envio
                }).eq("id", existing.id);
            } else {
                // Note: Creating a new record here works, but leaves other Pessoal fields null.
                // This is fine since they default to null/false/0 in the DB.
                await supabase.from("pessoal").insert(payload);
            }

            toast.success("Dados salvos com sucesso!");

            // Reload this specific record
            const { data } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", competencia).single();
            if (data) {
                setPessoalData(prev => ({ ...prev, [empresaId]: data }));
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
    const completedCount = filtered.filter(e => editForm[e.id]?.dctf_web_gerada).length;

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-card-foreground">Declarações Mensais</h1>
                    <p className="text-sm text-muted-foreground mt-1">Controle de declarações sincronizado com o Departamento Pessoal</p>
                </div>
                <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase">Empresas Ativas</p>
                    <p className="text-2xl font-bold text-primary mt-1">{filtered.length}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase">Concluídas</p>
                    <p className="text-2xl font-bold text-success mt-1">{completedCount}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase">Pendentes</p>
                    <p className="text-2xl font-bold text-warning mt-1">{filtered.length - completedCount}</p>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar empresa por nome ou CNPJ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                />
            </div>

            <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "ativas"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("ativas")}
                >
                    Empresas Ativas
                </button>
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "mei"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("mei")}
                >
                    Empresas MEI
                </button>
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "paralisadas"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("paralisadas")}
                >
                    Empresas Paralisadas
                </button>
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "baixadas"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("baixadas")}
                >
                    Empresas Baixadas
                </button>
                <button
                    className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "entregue"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                    onClick={() => setActiveTab("entregue")}
                >
                    Empresas Entregues
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-4 font-medium">Situação</th>
                                <th className="px-4 py-4 font-medium">Empresa</th>
                                <th className="px-4 py-4 font-medium">CNPJ</th>
                                <th className="px-4 py-4 font-medium">DCTF WEB</th>
                                <th className="px-4 py-4 font-medium">Data de Envio</th>
                                <th className="px-4 py-4 font-medium text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((emp) => {
                                const form = editForm[emp.id] || {};
                                const isGenerated = form.dctf_web_gerada;

                                return (
                                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3">
                                            {isGenerated ? (
                                                <span className="flex items-center gap-1.5 text-success font-medium">
                                                    <CheckCircle size={16} /> Gerada
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                                                    <Circle size={16} /> Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-card-foreground">
                                            {emp.nome_empresa}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                            {emp.cnpj || "—"}
                                        </td>
                                        <td className="px-4 py-3 w-48">
                                            <select
                                                value={isGenerated ? "sim" : "nao"}
                                                onChange={e => {
                                                    const val = e.target.value === "sim";
                                                    updateForm(emp.id, "dctf_web_gerada", val);
                                                    if (!val) updateForm(emp.id, "dctf_web_data_envio", "");
                                                }}
                                                className={inputCls}
                                            >
                                                <option value="nao">Não Gerada</option>
                                                <option value="sim">Gerada</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 w-48">
                                            {isGenerated ? (
                                                <input
                                                    type="date"
                                                    value={form.dctf_web_data_envio || ""}
                                                    onChange={e => updateForm(emp.id, "dctf_web_data_envio", e.target.value)}
                                                    className={inputCls}
                                                />
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic px-2">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleSave(emp.id)}
                                                disabled={isSaving}
                                                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                                                style={{ background: "var(--gradient-primary)" }}
                                            >
                                                <Save size={14} /> Salvar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        Nenhuma empresa encontrada com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeclaracoesMensaisPage;
