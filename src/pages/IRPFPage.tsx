
import React, { useState } from "react";
import { Plus, XCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIRPF } from "@/hooks/useIRPF";
import { IRPFForm } from "@/components/irpf/IRPFForm";
import { IRPFRecordCard } from "@/components/irpf/IRPFRecordCard";
import { IRPFRecord } from "@/types/irpf";
import { List } from "lucide-react";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const IRPFPage = () => {
    const { user, userData } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"geral" | "minhas">("geral");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    const { records: originalRecords, isLoading, saveRecord, deleteRecord } = useIRPF(selectedYear);
    const [records, setRecords] = useState<IRPFRecord[]>([]);

    const [newRecord, setNewRecord] = useState<Partial<IRPFRecord>>({
        nome_completo: "", cpf: "", valor_a_pagar: 0, status_pago: false, 
        status_transmissao: "pendente", data_pagamento: null, data_transmissao: null, feito_por: "", forma_pagamento: ""
    });

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    // Sync original records to local state for internal edits
    React.useEffect(() => {
        if (!isLoading && originalRecords) {
            setRecords(originalRecords);
        }
    }, [originalRecords, isLoading]);

    const filteredRecords = records.filter(r => {
        const matchSearch = r.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.cpf && r.cpf.includes(searchTerm));
        
        if (activeTab === "minhas") {
            return matchSearch && r.feito_por === userData?.nome;
        }
        return matchSearch;
    });

    const handleQuickToggleTransmissao = (record: IRPFRecord) => {
        const isTransmitida = record.status_transmissao === 'transmitida';
        saveRecord.mutate({
            ...record,
            status_transmissao: isTransmitida ? 'pendente' : 'transmitida',
            data_transmissao: !isTransmitida ? new Date().toISOString().split('T')[0] : record.data_transmissao
        });
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-fade-in relative pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0">
                <div className="space-y-1 -mt-1">
                    <div className="flex items-center gap-3">
                        <h1 className="header-title">IRPF <span className="text-primary">{selectedYear}</span></h1>
                        <FavoriteToggleButton moduleId="irpf" />
                    </div>
                    <p className="subtitle-premium">Gestão de Declarações de Imposto de Renda Pessoa Física.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl shadow-sm">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ano:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-foreground text-sm focus:outline-none font-bold"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setIsAdding(!isAdding);
                            if (!isAdding) setExpandedId(null);
                        }}
                        className={`button-premium shadow-lg shadow-primary/20 w-full sm:w-auto ${isAdding ? 'bg-muted text-foreground !from-muted !to-muted !bg-none border border-border' : ''}`}
                    >
                        {isAdding ? <XCircle size={18} /> : <Plus size={18} />}
                        {isAdding ? 'Cancelar' : 'Novo Cliente'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex border-b border-border w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <button
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "geral" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setActiveTab("geral")}
                    >
                        Geral
                    </button>
                    <button
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "minhas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => setActiveTab("minhas")}
                    >
                        Minhas Declarações
                    </button>
                </div>
                <div className="relative max-w-sm flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou CPF..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all" 
                    />
                </div>
            </div>

            {isAdding && (
                <IRPFForm 
                    record={newRecord}
                    setRecord={setNewRecord}
                    year={selectedYear}
                    onCancel={() => setIsAdding(false)}
                    onSave={() => {
                        if (!newRecord.nome_completo) {
                            toast.error("Nome completo é obrigatório");
                            return;
                        }
                        saveRecord.mutate(newRecord);
                        setIsAdding(false);
                        setNewRecord({ nome_completo: "", cpf: "", valor_a_pagar: 0, status_pago: false, status_transmissao: "pendente", data_pagamento: null, data_transmissao: null, feito_por: "", forma_pagamento: "" });
                    }}
                />
            )}

            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-xl py-12 text-center text-muted-foreground">
                        Nenhum registro encontrado para o ano de {selectedYear}.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredRecords.map(record => (
                            <IRPFRecordCard 
                                key={record.id}
                                record={record}
                                isExpanded={expandedId === record.id}
                                onToggleExpand={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                onUpdateField={(id, field, value) => setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r))}
                                onSave={(r) => {
                                    saveRecord.mutate(r);
                                    setExpandedId(null);
                                }}
                                onDelete={(id) => deleteRecord.mutate(id)}
                                onQuickToggleTransmissao={handleQuickToggleTransmissao}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default IRPFPage;
