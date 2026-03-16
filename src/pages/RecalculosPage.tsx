import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, ChevronDown, ChevronUp, Save, CheckCircle, Circle, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useEmpresas } from "@/hooks/useEmpresas";

const regimeLabels: Record<string, string> = { simples: "Simples Nacional", lucro_presumido: "Lucro Presumido", lucro_real: "Lucro Real", mei: "MEI" };

const RecalculosPage: React.FC = () => {
  const { empresas, loading } = useEmpresas("recalculos");
  const [parcelamentos, setParcelamentos] = useState<any[]>([]);
  const [recalculos, setRecalculos] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"ativas" | "paralisadas" | "baixadas">("ativas");

  // Inline Form State
  const [showNovoForm, setShowNovoForm] = useState(false);
  const [newRecalculo, setNewRecalculo] = useState({
    empresa_id: "",
    parcelamento_id: "",
    modulo_origem: "Fiscal",
    guia: "",
    data_recalculo: "",
    data_envio: "",
    forma_envio: "",
  });

  const loadData = async () => {
    // Load Parcelamentos (Clients)
    const { data: parcs } = await supabase.from("parcelamentos").select("*").order("nome_pessoa_fisica");
    setParcelamentos(parcs || []);

    // Load Recalculos
    const { data: recs } = await supabase
      .from("recalculos")
      .select(`
        *, 
        empresas(nome_empresa, cnpj, regime_tributario, situacao),
        parcelamentos(nome_pessoa_fisica, cpf_pessoa_fisica, tipo_parcelamento)
      `)
      .eq("competencia", competencia)
      .order("created_at", { ascending: false });
    setRecalculos(recs || []);
  };

  useEffect(() => {
    loadData();
  }, [competencia]);

  const filtered = recalculos.filter(r => {
    const nomeEmpresa = r.empresas?.nome_empresa || "";
    const nomePessoa = r.parcelamentos?.nome_pessoa_fisica || "";
    const termoBusca = search.toLowerCase();

    const matchSearch = nomeEmpresa.toLowerCase().includes(termoBusca) ||
      nomePessoa.toLowerCase().includes(termoBusca) ||
      r.guia?.toLowerCase().includes(termoBusca) ||
      r.modulo_origem?.toLowerCase().includes(termoBusca);

    let matchTab = false;
    // Se for parcelamento, mostra em "Ativas" por padrão, já que não tem a "situação" da empresa diretamente atrelada ao PF
    const situacao = r.empresas?.situacao;
    if (activeTab === "ativas") {
      matchTab = !situacao || situacao === "ativa";
    } else if (activeTab === "paralisadas") {
      matchTab = situacao === "paralisada";
    } else if (activeTab === "baixadas") {
      matchTab = situacao === "baixada";
    }

    return matchSearch && matchTab;
  });

  const toggleExpand = (id: string, recalculo: any) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setEditForm({
      ...editForm,
      [id]: {
        status: recalculo.status || "pendente",
        data_envio: recalculo.data_envio || "",
        forma_envio: recalculo.forma_envio || "",
      }
    });
  };

  const handleSaveUpdate = async (id: string) => {
    const form = editForm[id];
    try {
      const { error } = await supabase.from("recalculos").update({
        status: form.status,
        data_envio: form.data_envio || null,
        forma_envio: form.forma_envio || null,
      }).eq("id", id);

      if (error) throw error;
      toast.success("Recálculo atualizado com sucesso!");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateForm = (id: string, field: string, value: any) => {
    setEditForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleCreateRecalculo = async () => {
    try {
      const isParcelamento = newRecalculo.modulo_origem === "Parcelamentos";

      if (isParcelamento && !newRecalculo.parcelamento_id) {
        toast.error("Selecione o Cliente do Parcelamento");
        return;
      }
      if (!isParcelamento && !newRecalculo.empresa_id) {
        toast.error("Selecione a Empresa");
        return;
      }
      if (!newRecalculo.guia) {
        toast.error("Preencha a descrição da Guia");
        return;
      }

      const payload = {
        empresa_id: isParcelamento ? null : newRecalculo.empresa_id,
        parcelamento_id: isParcelamento ? newRecalculo.parcelamento_id : null,
        modulo_origem: newRecalculo.modulo_origem,
        guia: newRecalculo.guia,
        competencia,
        data_recalculo: newRecalculo.data_recalculo || null,
        data_envio: newRecalculo.data_envio || null,
        forma_envio: newRecalculo.forma_envio || null,
        status: "pendente" as any
      };

      const { error } = await supabase.from("recalculos").insert(payload);
      if (error) throw error;

      toast.success("Recálculo cadastrado com sucesso!");
      setShowNovoForm(false);
      setNewRecalculo({ empresa_id: "", parcelamento_id: "", modulo_origem: "Fiscal", guia: "", data_recalculo: "", data_envio: "", forma_envio: "" });
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar recálculo: " + err.message);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";
  const completedCount = filtered.filter(r => r.status === "enviada" || r.status === "gerada").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:block">Mês:</label>
          <input
            type="month"
            value={competencia}
            onChange={e => setCompetencia(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none font-semibold shadow-sm"
          />
          <button
            onClick={() => setShowNovoForm(!showNovoForm)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md w-full sm:w-auto ${showNovoForm
              ? "bg-muted text-foreground border border-border hover:bg-muted/80"
              : "text-primary-foreground hover:opacity-90 active:scale-95"
              }`}
            style={!showNovoForm ? { background: "var(--gradient-primary)" } : {}}
          >
            {showNovoForm ? "Cancelar" : <><Plus size={16} /> Cadastrar Recálculo</>}
          </button>
        </div>
      </div>

      {showNovoForm && (
        <div className="bg-card border border-primary/20 p-5 rounded-xl shadow-sm animate-fade-in">
          <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2"><Plus size={18} className="text-primary" /> Novo Recálculo - {competencia}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Módulo de Origem</label>
              <select
                value={newRecalculo.modulo_origem}
                onChange={e => setNewRecalculo({ ...newRecalculo, modulo_origem: e.target.value, empresa_id: "", parcelamento_id: "" })}
                className={inputCls}
              >
                <option value="Fiscal">Fiscal</option>
                <option value="Pessoal">Pessoal</option>
                <option value="Licenças">Licenças</option>
                <option value="Parcelamentos">Parcelamentos</option>
              </select>
            </div>

            {newRecalculo.modulo_origem === "Parcelamentos" ? (
              <div>
                <label className={labelCls}>Cliente do Parcelamento</label>
                <select value={newRecalculo.parcelamento_id} onChange={e => setNewRecalculo({ ...newRecalculo, parcelamento_id: e.target.value })} className={inputCls}>
                  <option value="">Selecione o cliente...</option>
                  {parcelamentos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome_pessoa_fisica}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Empresa</label>
                <select value={newRecalculo.empresa_id} onChange={e => setNewRecalculo({ ...newRecalculo, empresa_id: e.target.value })} className={inputCls}>
                  <option value="">Selecione a empresa...</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome_empresa}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelCls}>Guia (Descrição manual)</label>
              <input value={newRecalculo.guia} onChange={e => setNewRecalculo({ ...newRecalculo, guia: e.target.value })} className={inputCls} placeholder="Ex: DAS Maior, INSS Ref..." />
            </div>

            <div>
              <label className={labelCls}>Forma de Envio</label>
              <input value={newRecalculo.forma_envio} onChange={e => setNewRecalculo({ ...newRecalculo, forma_envio: e.target.value })} className={inputCls} placeholder="Ex: WhatsApp, Email..." />
            </div>

            <div>
              <label className={labelCls}>Data do Recálculo</label>
              <input type="date" value={newRecalculo.data_recalculo} onChange={e => setNewRecalculo({ ...newRecalculo, data_recalculo: e.target.value })} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Data de Envio</label>
              <input type="date" value={newRecalculo.data_envio} onChange={e => setNewRecalculo({ ...newRecalculo, data_envio: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button onClick={handleCreateRecalculo} className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90" style={{ background: "var(--gradient-primary)" }}>
              <Save size={16} /> Salvar Recálculo
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase font-medium">Total de Guias</p><p className="text-2xl font-bold text-primary mt-1">{filtered.length}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase font-medium">Concluídas</p><p className="text-2xl font-bold text-success mt-1">{completedCount}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground uppercase font-medium">Pendentes</p><p className="text-2xl font-bold text-warning mt-1">{filtered.length - completedCount}</p></div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Buscar por cliente, empresa, guia ou módulo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none shadow-sm transition-all" />
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
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="module-card text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            {search ? "Nenhum resultado encontrado para a busca." : "Nenhum recálculo cadastrado para esta competência."}
          </div>
        ) : (
          filtered.map(r => {
            const isOpen = expanded === r.id;
            const form = editForm[r.id] || {};
            const done = r.status === "enviada" || r.status === "gerada";

            // Determine display names based on Origin
            const isParcelamento = r.modulo_origem === "Parcelamentos";
            const displayName = isParcelamento ? r.parcelamentos?.nome_pessoa_fisica : r.empresas?.nome_empresa;
            const displayDoc = isParcelamento ? r.parcelamentos?.cpf_pessoa_fisica : r.empresas?.cnpj;
            const displayExtra = isParcelamento ? r.parcelamentos?.tipo_parcelamento : regimeLabels[r.empresas?.regime_tributario];

            return (
              <div key={r.id} className="module-card !p-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors gap-4" onClick={() => toggleExpand(r.id, r)}>
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="mt-1 sm:mt-0">
                      {done ? <CheckCircle size={20} className="text-success" /> : <Circle size={20} className="text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-card-foreground text-sm sm:text-base">{displayName}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                          {isParcelamento ? <Users size={10} /> : <Building2 size={10} />}
                          {r.modulo_origem}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong className="text-foreground">{r.guia}</strong> • {displayDoc || "S/N"} {displayExtra ? `• ${displayExtra}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                    <span className={`badge-status ${done ? "badge-success" : "badge-warning"}`}>{done ? "Concluído" : "Pendente"}</span>
                    {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-muted/10">
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Status da Guia</label>
                          <select value={form.status || "pendente"} onChange={e => updateForm(r.id, "status", e.target.value)} className={inputCls}>
                            <option value="pendente">Pendente para Envio</option>
                            <option value="gerada">Em Andamento</option>
                            <option value="enviada">Concluída / Enviada</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Data de Envio</label>
                          <input type="date" value={form.data_envio || ""} onChange={e => updateForm(r.id, "data_envio", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Forma de Envio</label>
                          <input value={form.forma_envio || ""} onChange={e => updateForm(r.id, "forma_envio", e.target.value)} className={inputCls} placeholder="Ex: Email, WhatsApp..." />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border pt-4 mt-2">
                        <span className="bg-background px-3 py-1.5 rounded-md border border-border inline-block">
                          📆 Data Base do Recálculo: <strong className="text-foreground">{r.data_recalculo ? new Date(r.data_recalculo).toLocaleDateString('pt-BR') : "Não informada"}</strong>
                        </span>
                        <button onClick={() => handleSaveUpdate(r.id)} className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95 w-full sm:w-auto" style={{ background: "var(--gradient-primary)" }}>
                          <Save size={14} /> Atualizar Guia
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

export default RecalculosPage;
