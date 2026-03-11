import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
    Plus, Search, User, FileText, CheckCircle2,
    XCircle, Clock, Calendar, DollarSign, Filter,
    ChevronDown, ChevronUp, Save, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IRPFRecord {
    id: string;
    nome_completo: string;
    cpf: string | null;
    ano_exercicio: number;
    valor_a_pagar: number;
    status_pago: boolean;
    data_pagamento: string | null;
    status_transmissao: string;
    data_transmissao: string | null;
    transmitido_por: string | null;
}

const IRPFPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<IRPFRecord[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // New record state
    const [newRecord, setNewRecord] = useState<Partial<IRPFRecord>>({
        nome_completo: "",
        cpf: "",
        valor_a_pagar: 0,
        status_pago: false,
        status_transmissao: "pendente",
        data_pagamento: null,
        data_transmissao: null,
        transmitido_por: ""
    });

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        if (user) {
            fetchRecords();
        }
    }, [user, selectedYear]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("controle_irpf")
                .select("*")
                .eq("ano_exercicio", selectedYear)
                .order("nome_completo");

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error("Erro ao buscar registros IRPF:", error);
            toast.error("Erro ao carregar dados do IRPF");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (record: Partial<IRPFRecord>) => {
        /* Se for novo cadastro (sem id), vamos garantir que o ano_exercicio seja o selecionado */
        const payload = {
            ...record,
            ano_exercicio: record.id ? record.ano_exercicio : selectedYear,
            cpf: record.cpf || null,
            data_pagamento: record.data_pagamento || null,
            data_transmissao: record.data_transmissao || null,
            transmitido_por: record.transmitido_por || null,
            valor_a_pagar: Number(record.valor_a_pagar || 0)
        };

        try {
            const { error } = record.id
                ? await (supabase as any).from("controle_irpf").update(payload).eq("id", record.id)
                : await (supabase as any).from("controle_irpf").insert([payload]);

            if (error) throw error;

            toast.success(record.id ? "Registro atualizado!" : "Cliente cadastrado com sucesso!");
            setIsAdding(false);
            setExpandedId(null);

            // Reset form
            setNewRecord({
                nome_completo: "",
                cpf: "",
                valor_a_pagar: 0,
                status_pago: false,
                status_transmissao: "pendente",
                data_pagamento: null,
                data_transmissao: null,
                transmitido_por: ""
            });

            fetchRecords();
        } catch (error) {
            console.error("Erro ao salvar IRPF:", error);
            toast.error("Erro ao salvar informações");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este registro?")) return;
        try {
            const { error } = await (supabase as any).from("controle_irpf").delete().eq("id", id);
            if (error) throw error;
            toast.success("Registro removido");
            fetchRecords();
        } catch (error) {
            toast.error("Erro ao remover registro");
        }
    };

    const filteredRecords = records.filter(r =>
        r.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.cpf && r.cpf.includes(searchTerm))
    );

    const inputCls = "w-full px-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all";
    const labelCls = "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">IRPF <span className="text-primary">{selectedYear}</span></h1>
                    <p className="text-sm text-muted-foreground">Gestão IRPF</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none shadow-sm"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <button
                        onClick={() => {
                            setIsAdding(!isAdding);
                            if (!isAdding) setExpandedId(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold shadow-md ${isAdding ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95'}`}
                    >
                        {isAdding ? <XCircle size={18} /> : <Plus size={18} />}
                        {isAdding ? 'cancelar' : 'Novo Cliente'}
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-4 duration-500 ring-4 ring-primary/5">
                    <div className="flex items-center gap-3 text-primary mb-6 border-b border-border pb-4">
                        <div className="p-2 bg-primary/10 rounded-lg"><Plus size={24} /></div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Cadastro Completo</h2>
                            <p className="text-xs text-muted-foreground">Preencha todas as informações para o exercício {selectedYear}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-primary/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-primary pl-2">Dados Básicos</h3>
                            <div>
                                <label className={labelCls}>Nome Completo</label>
                                <input
                                    type="text"
                                    value={newRecord.nome_completo}
                                    onChange={e => setNewRecord({ ...newRecord, nome_completo: e.target.value })}
                                    className={inputCls}
                                    placeholder="Nome do cliente"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>CPF</label>
                                <input
                                    type="text"
                                    value={newRecord.cpf || ''}
                                    onChange={e => setNewRecord({ ...newRecord, cpf: e.target.value })}
                                    className={inputCls}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-emerald-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-emerald-500 pl-2">Financeiro</h3>
                            <div>
                                <label className={labelCls}>Valor a Pagar (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newRecord.valor_a_pagar}
                                        onChange={e => setNewRecord({ ...newRecord, valor_a_pagar: Number(e.target.value) })}
                                        className={inputCls + " pl-10"}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                                <span className="text-sm font-bold text-muted-foreground uppercase">Status Pago?</span>
                                <button
                                    onClick={() => setNewRecord({ ...newRecord, status_pago: !newRecord.status_pago })}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${newRecord.status_pago ? 'bg-emerald-500 text-white shadow-lg' : 'bg-muted text-muted-foreground'}`}
                                >
                                    {newRecord.status_pago ? 'SIM' : 'NÃO'}
                                </button>
                            </div>
                            <div>
                                <label className={labelCls}>Data de Pagamento</label>
                                <input
                                    type="date"
                                    value={newRecord.data_pagamento || ''}
                                    onChange={e => setNewRecord({ ...newRecord, data_pagamento: e.target.value })}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-blue-500/60 uppercase tracking-widest flex items-center gap-2 border-l-2 border-blue-500 pl-2">Transmissão</h3>
                            <div>
                                <label className={labelCls}>Status Transmissão</label>
                                <select
                                    value={newRecord.status_transmissao}
                                    onChange={e => setNewRecord({ ...newRecord, status_transmissao: e.target.value })}
                                    className={inputCls}
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="transmitida">Transmitida</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Data de Transmissão</label>
                                <input
                                    type="date"
                                    value={newRecord.data_transmissao || ''}
                                    onChange={e => setNewRecord({ ...newRecord, data_transmissao: e.target.value })}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Transmitido por</label>
                                <input
                                    type="text"
                                    value={newRecord.transmitido_por || ''}
                                    onChange={e => setNewRecord({ ...newRecord, transmitido_por: e.target.value })}
                                    className={inputCls}
                                    placeholder="Nome do responsável"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-8 border-t border-border mt-8">
                        <button
                            onClick={async () => {
                                if (!newRecord.nome_completo) {
                                    toast.error("Nome completo é obrigatório");
                                    return;
                                }
                                await handleSave(newRecord);
                            }}
                            className="bg-primary text-primary-foreground px-10 py-3 rounded-xl hover:scale-105 transition-all font-black uppercase tracking-widest shadow-lg"
                        >
                            Finalizar Cadastro
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-xl py-12 text-center text-muted-foreground">
                        Nenhum registro encontrado para o ano de {selectedYear}.
                    </div>
                ) : (
                    filteredRecords.map(record => (
                        <div key={record.id} className={`bg-card border rounded-xl overflow-hidden transition-all duration-300 ${expandedId === record.id ? 'ring-2 ring-primary/20 bg-muted/20' : 'hover:border-primary/30'}`}>
                            {/* Header (Accordion Toggle) */}
                            <div
                                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
                            >
                                <div className="flex items-center gap-3 min-w-[200px]">
                                    <div className={`p-2 rounded-lg ${record.status_transmissao === 'transmitida' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">{record.nome_completo}</h3>
                                        <p className="text-xs text-muted-foreground">{record.cpf || 'Sem CPF'} • Exercício {record.ano_exercicio}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="hidden sm:flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Pagamento</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {record.status_pago ? (
                                                <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                                                    <CheckCircle2 size={14} /> Pago
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                                                    <XCircle size={14} /> Pendente
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Status</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {record.status_transmissao === 'transmitida' ? (
                                                <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Transmitida</span>
                                            ) : (
                                                <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pendente</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-muted-foreground transition-transform duration-300">
                                        {expandedId === record.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>

                            {/* Content (Accordion Body) */}
                            {expandedId === record.id && (
                                <div className="p-6 border-t border-border/50 bg-background/40 space-y-6 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Coluna 1: Pagamento */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <DollarSign size={14} /> Informações de Pagamento
                                            </h4>
                                            <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                                                <div className="space-y-1.5 pt-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                                                    <input
                                                        type="text"
                                                        value={record.nome_completo}
                                                        onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, nome_completo: e.target.value } : r))}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">CPF</label>
                                                    <input
                                                        type="text"
                                                        value={record.cpf || ''}
                                                        onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, cpf: e.target.value } : r))}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 pt-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Valor a Pagar</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">R$</span>
                                                        <input
                                                            type="number"
                                                            value={record.valor_a_pagar}
                                                            onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, valor_a_pagar: Number(e.target.value) } : r))}
                                                            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Data do Pagamento</label>
                                                    <input
                                                        type="date"
                                                        value={record.data_pagamento || ''}
                                                        onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, data_pagamento: e.target.value } : r))}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coluna 2: Transmissão */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={14} /> Status de Transmissão
                                            </h4>
                                            <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Transmissão</span>
                                                    <button
                                                        onClick={() => handleSave({
                                                            ...record,
                                                            status_transmissao: record.status_transmissao === 'transmitida' ? 'pendente' : 'transmitida',
                                                            data_transmissao: record.status_transmissao === 'pendente' ? new Date().toISOString().split('T')[0] : record.data_transmissao
                                                        })}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${record.status_transmissao === 'transmitida' ? 'bg-blue-500 text-white' : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white'}`}
                                                    >
                                                        {record.status_transmissao === 'transmitida' ? 'TRANSMITIDA' : 'PENDENTE'}
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5 pt-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Data de Transmissão</label>
                                                    <input
                                                        type="date"
                                                        value={record.data_transmissao || ''}
                                                        onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, data_transmissao: e.target.value } : r))}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-muted-foreground">Transmitido por</label>
                                                    <input
                                                        type="text"
                                                        value={record.transmitido_por || ''}
                                                        onChange={e => setRecords(records.map(r => r.id === record.id ? { ...r, transmitido_por: e.target.value } : r))}
                                                        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary"
                                                        placeholder="Nome do responsável"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coluna 3: Ações e Info */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <Plus size={14} /> Ações Disponíveis
                                            </h4>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => handleSave(record)}
                                                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-all font-medium"
                                                >
                                                    <Save size={18} /> Salvar Alterações
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive py-2 rounded-lg hover:bg-destructive hover:text-white transition-all font-medium"
                                                >
                                                    <Trash2 size={18} /> Excluir Registro
                                                </button>
                                            </div>
                                            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                <p className="text-[10px] text-primary/60 font-medium uppercase tracking-tighter mb-1 font-bold">Resumo Financeiro</p>
                                                <p className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.valor_a_pagar)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default IRPFPage;
