
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Save, CheckCircle, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSocietario } from "@/hooks/useSocietario";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const DeclaracoesMensaisPage: React.FC = () => {
    const { user } = useAuth();
    const { getPaginatedEmpresas } = useSocietario();
    const [search, setSearch] = useState("");
    const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
    
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 12 });
    const [paginatedData, setPaginatedData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingPaginated, setLoadingPaginated] = useState(false);

    const [pessoalData, setPessoalData] = useState<Record<string, any>>({});
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"ativas" | "mei" | "paralisadas" | "baixadas" | "entregue">("ativas");

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [search, activeTab]);

    useEffect(() => {
        const fetch = async () => {
            setLoadingPaginated(true);
            try {
                const { data, count } = await getPaginatedEmpresas(
                    pagination.pageIndex,
                    pagination.pageSize,
                    search,
                    activeTab,
                    "todos",
                    "declaracoes_mensais",
                    user?.id
                );
                setPaginatedData(data);
                setTotalCount(count);
            } catch (err) {
                console.error("Erro ao carregar empresas paginadas:", err);
            } finally {
                setLoadingPaginated(false);
            }
        };
        fetch();
    }, [pagination, search, activeTab, user]);

    useEffect(() => {
        const load = async () => {
            if (paginatedData.length === 0) {
                setPessoalData({});
                setEditForm({});
                return;
            }
            const empresaIds = paginatedData.map(e => e.id);
            const { data } = await supabase.from("pessoal").select("*")
                .eq("competencia", competencia)
                .in("empresa_id", empresaIds);
            const map: Record<string, any> = {};
            const formMap: Record<string, any> = {};

            data?.forEach(p => {
                map[p.empresa_id] = p;
                formMap[p.empresa_id] = {
                    dctf_web_gerada: p.dctf_web_gerada || false,
                    dctf_web_data_envio: (p as any).dctf_web_data_envio || ""
                };
            });

            // For businesses not in "pessoal" yet
            empresaIds.forEach(id => {
                if (!formMap[id]) {
                    formMap[id] = { dctf_web_gerada: false, dctf_web_data_envio: "" };
                }
            });

            setPessoalData(map);
            setEditForm(formMap);
        };
        load();
    }, [competencia, paginatedData]);

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
                await supabase.from("pessoal").update({
                    dctf_web_gerada: payload.dctf_web_gerada,
                    dctf_web_data_envio: payload.dctf_web_data_envio
                }).eq("id", existing.id);
            } else {
                await supabase.from("pessoal").insert(payload);
            }

            toast.success("Dados salvos com sucesso!");

            const { data } = await supabase.from("pessoal").select("*").eq("empresa_id", empresaId).eq("competencia", competencia).maybeSingle();
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
    const completedCountInPage = paginatedData.filter(e => editForm[e.id]?.dctf_web_gerada).length;

    if (loadingPaginated && paginatedData.length === 0) {
        return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm w-full sm:w-auto">
                    <FavoriteToggleButton moduleId="declaracoes-mensais" />
                    <div>
                        <h1 className="text-2xl font-bold text-card-foreground">Declarações Mensais</h1>
                        <p className="text-sm text-muted-foreground mt-1">Controle de declarações sincronizado.</p>
                    </div>
                </div>
                <input
                    type="month"
                    value={competencia}
                    onChange={e => setCompetencia(e.target.value)}
                    className="px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Empresas na Categoria</p>
                    <p className="text-2xl font-black text-primary mt-1">{totalCount}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Nesta Página</p>
                    <p className="text-2xl font-black text-card-foreground mt-1">{paginatedData.length}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Concluídas (Página)</p>
                    <p className="text-2xl font-black text-success mt-1">{completedCountInPage}</p>
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
                {["ativas", "mei", "paralisadas", "baixadas", "entregue"].map(t => (
                    <button
                        key={t}
                        className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setActiveTab(t as any)}
                    >
                        {t === "ativas" ? "Empresas Ativas" : t === "mei" ? "Empresas MEI" : t === "paralisadas" ? "Empresas Paralisadas" : t === "entregue" ? "Empresas Entregues" : "Empresas Baixadas"}
                    </button>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm relative">
                {loadingPaginated && (
                   <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                       <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                   </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-4 font-black">Situação</th>
                                <th className="px-4 py-4 font-black">Empresa</th>
                                <th className="px-4 py-4 font-black">CNPJ</th>
                                <th className="px-4 py-4 font-black">DCTF WEB</th>
                                <th className="px-4 py-4 font-black text-center">Data de Envio</th>
                                <th className="px-4 py-4 font-black text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedData.map((emp) => {
                                const form = editForm[emp.id] || { dctf_web_gerada: false, dctf_web_data_envio: "" };
                                const isGenerated = form.dctf_web_gerada;

                                return (
                                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3">
                                            {isGenerated ? (
                                                <span className="flex items-center gap-1.5 text-success font-bold text-xs uppercase">
                                                    <CheckCircle size={14} /> Gerada
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs uppercase">
                                                    <Circle size={14} /> Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-card-foreground">
                                            {emp.nome_empresa}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
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
                                        <td className="px-4 py-3 w-48 text-center">
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
                                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50 uppercase tracking-widest bg-primary"
                                            >
                                                <Save size={14} /> Salvar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {paginatedData.length === 0 && !loadingPaginated && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground font-medium">
                                        Nenhuma empresa encontrada com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalCount > pagination.pageSize && (
                <div className="flex items-center justify-between mt-4 px-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Página {pagination.pageIndex + 1} de {Math.ceil(totalCount / pagination.pageSize)}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
                            disabled={pagination.pageIndex === 0 || loadingPaginated}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
                            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount || loadingPaginated}
                            className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeclaracoesMensaisPage;
