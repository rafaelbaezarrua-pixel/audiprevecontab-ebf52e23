import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateBR } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, isBefore, isSameDay } from "date-fns";
import { ParcelamentoRecord, ParcelamentoMensalRecord, GuiaStatus } from "@/types/administrative";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";

const ParcelamentosPage: React.FC = () => {
  const navigate = useNavigate();
  const [parcelamentos, setParcelamentos] = useState<ParcelamentoRecord[]>([]);
  const [mensalData, setMensalData] = useState<Record<string, ParcelamentoMensalRecord>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, Partial<ParcelamentoMensalRecord>>>({});
  const [activeTab, setActiveTab] = useState<"andamento" | "encerrados">("andamento");
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendente" | "concluido">("todos");

  useEffect(() => {
    const loadParcelamentos = async () => {
      const { data } = await supabase
        .from("parcelamentos")
        .select("*")
        .order("nome_pessoa_fisica");
      setParcelamentos((data as unknown as ParcelamentoRecord[]) || []);
    };
    loadParcelamentos();
  }, []);

  useEffect(() => {
    const loadMensal = async () => {
      const { data } = await (supabase.from("parcelamentos_mensal" as any).select("*").eq("competencia", competencia) as any);
      const map: Record<string, ParcelamentoMensalRecord> = {};
      data?.forEach((f) => {
        map[f.parcelamento_id] = f as unknown as ParcelamentoMensalRecord;
      });
      setMensalData(map);
    };
    loadMensal();
  }, [competencia]);

  const calcIsEncerrado = (p: ParcelamentoRecord) => {
    if (p.encerrado) return true;
    if (p.previsao_termino) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const previsao = new Date(p.previsao_termino);
      // Extra hour adjustment for timezone if needed, but simple comparison suffices for dates
      previsao.setHours(0, 0, 0, 0);
      if (isBefore(previsao, hoje) || isSameDay(previsao, hoje)) return true;
    }
    return false;
  };

  const filtered = parcelamentos.filter((p) => {
    const isEncerrado = calcIsEncerrado(p);
    const matchesTab = activeTab === "encerrados" ? isEncerrado : !isEncerrado;
    const matchesSearch =
      p.nome_pessoa_fisica?.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf_pessoa_fisica?.includes(search);
    
    let matchesStatus = true;
    if (filterStatus !== "todos") {
      const record = mensalData[p.id];
      const isConcluido = record?.status === "enviada" || record?.status === "isento" || record?.status === "ok";
      matchesStatus = filterStatus === "concluido" ? isConcluido : !isConcluido;
    }

    return matchesTab && matchesSearch && matchesStatus;
  });

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    const existing = (mensalData[id] || {}) as Partial<ParcelamentoMensalRecord>;

    setEditForm((prev) => ({
      ...prev,
      [id]: {
        status: existing.status || "pendente",
        data_envio: existing.data_envio || "",
        observacoes: existing.observacoes || "",
      },
    }));
  };

  const handleSaveMensal = async (parcelamentoId: string) => {
    const form = (editForm[parcelamentoId] || {}) as Partial<ParcelamentoMensalRecord>;
    const existing = mensalData[parcelamentoId];
    try {
      const payload = {
        parcelamento_id: parcelamentoId,
        competencia,
        status: form.status || "pendente",
        data_envio: form.data_envio || null,
        observacoes: form.observacoes || null,
      };

        if (existing?.id) {
          await supabase
            .from("parcelamentos_mensal" as any)
            .update(payload)
            .eq("id", existing.id);
        } else {
          await supabase.from("parcelamentos_mensal" as any).insert(payload);
        }
      toast.success("Mês atualizado com sucesso!");

      // Refresh just the month data
      const { data } = await (supabase
        .from("parcelamentos_mensal" as any)
        .select("*")
        .eq("competencia", competencia) as any);
      const map: Record<string, ParcelamentoMensalRecord> = {};
      data?.forEach((f) => {
        map[f.parcelamento_id] = f as unknown as ParcelamentoMensalRecord;
      });
      setMensalData(map);
      setExpanded(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteParcelamento = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este parcelamento? Isso removerá o histórico também.")) return;
    try {
      await supabase.from("parcelamentos").delete().eq("id", id);
      toast.success("Parcelamento excluído!");
      setParcelamentos(parcelamentos.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleEncerrado = async (p: ParcelamentoRecord) => {
    const isAtualmenteEncerrado = calcIsEncerrado(p);
    // Para reabrir, forçamos 'encerrado' para false E removemos a 'previsao_termino'
    // se ela já tiver passado, para não fechar automaticamente de novo.
    // Mas o mais seguro para "reabrir" é apenas setar a flag `encerrado` e
    // deixar a data original. Na lógica, `previsao_termino` ainda forçaria encerrado.
    // Como a instrução era ter um controle manual da aba, vamos usar a flag `encerrado`
    // e para forçar reabrir podemos precisar limpar a data. Para o escopo pedido,
    // o foco é encerrar manualmente.

    // Simplificando o pedido: Mudar a flag `encerrado` inverte a situação?
    // Se "Em Andamento (isEncerrado = false)", marcamos encerrado = true.
    // Se "Encerrado (isEncerrado = true)", marcamos encerrado = false E podemos ter que adiar a previsão 
    // ou apenas dar prioridade a flag false se quisermos um override? 
    // Vamos apenas rodar a flag `encerrado` boolean pra simular ação manual
    try {
      const newVal = !p.encerrado;
      // Se tentou re-abrir mas a data já passou, alertar? Ou limpar a data?
      // Vamos apagar a data de encerramento se ele explicitamente reabrir para não dar conflito 
      const payload: Partial<ParcelamentoRecord> = { encerrado: newVal };

      if (!newVal && p.previsao_termino) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const prev = new Date(p.previsao_termino);
        prev.setHours(0, 0, 0, 0);
        if (isBefore(prev, hoje) || isSameDay(prev, hoje)) {
          if (window.confirm("A previsão de término deste parcelamento já passou. Para reabri-lo, a previsão será limpa. Deseja continuar?")) {
            payload.previsao_termino = null;
          } else {
            return;
          }
        }
      }

      const { error } = await supabase.from("parcelamentos").update(payload).eq("id", p.id);
      if (error) throw error;

      toast.success(newVal ? "Parcelamento encerrado." : "Parcelamento reaberto.");
      setParcelamentos(parcelamentos.map(item => item.id === p.id ? { ...item, ...payload } : item));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateForm = (id: string, field: string, value: string | GuiaStatus | null) => {
    setEditForm((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const inputCls =
    "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  const completedCount = parcelamentos.filter(
    (p) =>
      mensalData[p.id]?.status === "enviada" ||
      mensalData[p.id]?.status === "gerada"
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* Background decoration elements */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
             <h1 className="header-title">Gestão de <span className="text-primary/90">Parcelamentos</span></h1>
             <FavoriteToggleButton moduleId="parcelamentos" />
          </div>
          <p className="subtitle-premium">Acompanhamento estratégico de débitos, emissão de guias e controle de vigência.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-card border border-primary/10 p-2 rounded-2xl shadow-xl shadow-primary/5">
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-primary outline-none px-4 py-2 font-ubuntu"
            />
          </div>
          <button
            onClick={() => navigate("/parcelamentos/novo")}
            className="h-14 px-8 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
          >
            <Plus size={20} /> NOVO PARCELAMENTO
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Total Cadastrados", count: parcelamentos.length, cls: "text-primary", bg: "bg-primary/5", icon: <Circle size={24} /> },
          { label: "Guias Concluídas", count: completedCount, cls: "text-emerald-500", bg: "bg-emerald-500/5", icon: <CheckCircle size={24} /> },
          { label: "Pendências do Mês", count: parcelamentos.length - completedCount, cls: "text-amber-500", bg: "bg-amber-500/5", icon: <Clock size={24} /> }
        ].map(s => (
          <div key={s.label} className="group bg-card border border-border/60 rounded-[2rem] p-8 flex items-center justify-between hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{s.label}</p>
              <p className={`text-4xl font-black tracking-tight ${s.cls}`}>{s.count}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${s.bg} ${s.cls} border border-current/10 group-hover:scale-110 transition-transform duration-500`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* View Switch / Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar max-w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("andamento")}
          className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "andamento" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
        >
          Parcelamentos em Andamento
        </button>
        <button
          onClick={() => setActiveTab("encerrados")}
          className={`px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "encerrados" ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
        >
          Histórico de Encerrados
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="BUSCAR POR NOME, CPF OU CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-14 pl-14 pr-6 bg-card border border-border/60 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm group-hover:border-primary/20"
          />
        </div>
        
        <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/60 overflow-x-auto no-scrollbar w-full sm:w-auto shadow-sm">
          {[{ key: "todos", label: "Todos" }, { key: "pendente", label: "Pendentes" }, { key: "concluido", label: "Concluídos" }].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key as any)}
              className={`px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === f.key ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Grid */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-24 text-center bg-card border-2 border-dashed border-border/40 rounded-[2.5rem] opacity-40">
            <Search size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {search ? "Nenhum resultado para os termos buscados" : "Nenhum parcelamento registrado nesta categoria"}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const isOpen = expanded === p.id;
            const form = editForm[p.id] || {};
            const itemMensal = mensalData[p.id];
            const done = itemMensal?.status === "enviada" || itemMensal?.status === "ok" || itemMensal?.status === "isento";

            return (
              <div key={p.id} className={`group bg-card border ${isOpen ? 'border-primary/30 shadow-2xl' : 'border-border/60 hover:border-primary/20'} rounded-[2rem] transition-all duration-300 overflow-hidden`}>
                <div
                  className={`flex flex-col lg:flex-row lg:items-center justify-between p-6 cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${done ? 'bg-emerald-500 text-white shadow-emerald-500/10' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'}`}>
                      {done ? <CheckCircle size={28} /> : <Clock size={28} />}
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-black text-sm uppercase tracking-tight text-card-foreground">
                        {p.nome_pessoa_fisica}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-3">
                        <span>{p.cpf_pessoa_fisica || "S/N"}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{p.tipo_parcelamento}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="text-primary">{p.qtd_parcelas} PARCELAS</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-6 lg:mt-0">
                    <div className="flex items-center gap-3 mr-4">
                        <span className={`h-8 flex items-center px-4 rounded-full text-[9px] font-black uppercase tracking-widest border ${done ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-100' : 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm shadow-amber-100'}`}>
                          {itemMensal?.status === "enviada" ? "ENVIADA" : itemMensal?.status === "gerada" ? "GERADA" : "PENDENTE"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleEncerrado(p); }}
                          className={`h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${calcIsEncerrado(p) ? 'bg-muted/50 border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/20' : 'bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-white hover:scale-[1.02]'}`}
                        >
                          {calcIsEncerrado(p) ? 'REABRIR' : 'ENCERRAR'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteParcelamento(p.id); }}
                          className="h-11 w-11 flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-border/40 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className={`p-2.5 rounded-xl bg-muted/50 text-muted-foreground transition-all duration-300 ${isOpen ? 'rotate-180 bg-primary/10 text-primary' : ''}`}>
                            <ChevronDown size={20} />
                        </div>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border/40 p-10 space-y-10 bg-muted/5 animate-in slide-in-from-top-4 duration-300">
                    {/* Header Details Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-border/40">
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Data Início</span>
                        <div className="h-11 flex items-center px-4 bg-card border border-border/40 rounded-xl text-xs font-bold text-card-foreground shadow-sm">
                           {p.data_inicio ? formatDateBR(p.data_inicio) : "—"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Previsão Término</span>
                        <div className="h-11 flex items-center px-4 bg-card border border-border/40 rounded-xl text-xs font-bold text-card-foreground shadow-sm">
                           {p.previsao_termino ? formatDateBR(p.previsao_termino) : "—"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Forma de Envio</span>
                        <div className="h-11 flex items-center px-4 bg-card border border-border/40 rounded-xl text-xs font-bold text-card-foreground shadow-sm uppercase">
                           {p.forma_envio || "NÃO INFORMADA"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Metodologia de Acesso</span>
                        <div className="h-11 flex items-center px-4 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black text-primary uppercase shadow-sm">
                           {p.metodo_login === "gov_br" ? "CONTA GOV.BR" : p.metodo_login === "codigo_sn" ? "CÓD. ACESSO SN" : "PROCURAÇÃO ELETRÔNICA"}
                        </div>
                      </div>
                    </div>

                    {/* Access Credentials Box */}
                    {(p.login_gov_br || p.codigo_sn) && (
                      <div className="bg-card border border-primary/10 rounded-2xl p-6 flex flex-wrap gap-10 shadow-sm">
                         {p.metodo_login === "gov_br" && (
                           <>
                             <div className="space-y-1">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Login Gov.br</p>
                               <p className="font-mono text-sm font-bold text-card-foreground">{p.login_gov_br}</p>
                             </div>
                             <div className="space-y-1">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Senha Gov.br</p>
                               <p className="font-mono text-sm font-bold text-card-foreground">••••••••</p>
                             </div>
                           </>
                         )}
                         {p.metodo_login === "codigo_sn" && (
                           <div className="space-y-1">
                             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Código de Acesso</p>
                             <p className="font-mono text-sm font-bold text-card-foreground">{p.codigo_sn}</p>
                           </div>
                         )}
                      </div>
                    )}

                    {/* Monthly Form */}
                    <div className="space-y-8 pt-4">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-6 bg-primary rounded-full" />
                         <h4 className="text-[11px] font-black uppercase tracking-widest text-card-foreground">ATUALIZAÇÃO DO MÊS ({competencia.split("-").reverse().join("/")})</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status da Guia</label>
                          <select
                            value={form.status || "pendente"}
                            onChange={(e) => updateForm(p.id, "status", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all shadow-sm"
                          >
                            <option value="pendente">🔴 PENDENTE PARA ENVIO</option>
                            <option value="gerada">🟡 GUIA GERADA / EM ANDAMENTO</option>
                            <option value="enviada">🟢 CONCLUÍDO / ENVIADO AO CLIENTE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data Efetiva de Envio</label>
                          <input
                            type="date"
                            value={form.data_envio || ""}
                            onChange={(e) => updateForm(p.id, "data_envio", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-ubuntu shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observações Internas</label>
                          <input
                            value={form.observacoes || ""}
                            onChange={(e) => updateForm(p.id, "observacoes", e.target.value)}
                            className="w-full h-12 px-4 bg-card border border-border/60 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            placeholder="EX: FALTA EMITIR BOLETO ATUALIZADO..."
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          onClick={() => handleSaveMensal(p.id)}
                          className="h-14 px-12 bg-primary text-primary-foreground rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                        >
                          <Save size={18} /> SALVAR ATUALIZAÇÃO MENSAL
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ParcelamentosPage;
