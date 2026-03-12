import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  Circle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, isBefore, isSameDay } from "date-fns";

const ParcelamentosPage: React.FC = () => {
  const navigate = useNavigate();
  const [parcelamentos, setParcelamentos] = useState<any[]>([]);
  const [mensalData, setMensalData] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [competencia, setCompetencia] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"andamento" | "encerrados">("andamento");

  useEffect(() => {
    const loadParcelamentos = async () => {
      const { data } = await supabase
        .from("parcelamentos")
        .select("*")
        .order("nome_pessoa_fisica");
      setParcelamentos(data || []);
    };
    loadParcelamentos();
  }, []);

  useEffect(() => {
    const loadMensal = async () => {
      const { data } = await supabase
        .from("parcelamentos_mensal")
        .select("*")
        .eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach((f) => {
        map[f.parcelamento_id] = f;
      });
      setMensalData(map);
    };
    loadMensal();
  }, [competencia]);

  const calcIsEncerrado = (p: any) => {
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
    return matchesTab && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    const existing = mensalData[id] || {};

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
    const form = editForm[parcelamentoId];
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
          .from("parcelamentos_mensal")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await supabase.from("parcelamentos_mensal").insert(payload);
      }
      toast.success("Mês atualizado com sucesso!");

      // Refresh just the month data
      const { data } = await supabase
        .from("parcelamentos_mensal")
        .select("*")
        .eq("competencia", competencia);
      const map: Record<string, any> = {};
      data?.forEach((f) => {
        map[f.parcelamento_id] = f;
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

  const handleToggleEncerrado = async (p: any) => {
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
      const payload: any = { encerrado: newVal };

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

  const updateForm = (id: string, field: string, value: any) => {
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
        <div className="flex gap-3">
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl bg-background text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={() => navigate("/parcelamentos/novo")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus size={18} /> Novo Parcelamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase">
            Total Cadastrados
          </p>
          <p className="text-2xl font-bold text-primary mt-1">
            {parcelamentos.length}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase">
            Mês Concluído
          </p>
          <p className="text-2xl font-bold text-success mt-1">
            {completedCount}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground font-medium uppercase">
            Pendentes
          </p>
          <p className="text-2xl font-bold text-warning mt-1">
            {parcelamentos.length - completedCount}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
        />
      </div>

      <div className="flex border-b border-border overflow-x-auto no-scrollbar">
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "andamento"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("andamento")}
        >
          Em Andamento
        </button>
        <button
          className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === "encerrados"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          onClick={() => setActiveTab("encerrados")}
        >
          Parcelamentos Encerrados
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground">
            {search
              ? "Nenhum parcelamento encontrado na busca."
              : "Nenhum parcelamento cadastrado. Clique em Novo Parcelamento para começar."}
          </div>
        ) : (
          filtered.map((p) => {
            const isOpen = expanded === p.id;
            const form = editForm[p.id] || {};
            const done =
              mensalData[p.id]?.status === "enviada" ||
              mensalData[p.id]?.status === "gerada";

            return (
              <div key={p.id} className="module-card !p-0 overflow-hidden">
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors gap-4"
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : (
                      <Circle size={18} className="text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-semibold text-card-foreground">
                        {p.nome_pessoa_fisica}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.cpf_pessoa_fisica || "S/N"} • {p.tipo_parcelamento} •{" "}
                        {p.qtd_parcelas} Parcelas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                    <span
                      className={`badge-status ${done ? "badge-success" : "badge-warning"
                        }`}
                    >
                      {mensalData[p.id]?.status === "enviada"
                        ? "Enviada"
                        : mensalData[p.id]?.status === "gerada"
                          ? "Gerada"
                          : "Pendente"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEncerrado(p);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${calcIsEncerrado(p) ? 'border-border text-foreground bg-muted/50 hover:bg-muted' : 'border-destructive text-destructive bg-destructive/10 hover:bg-destructive/20'}`}
                    >
                      {calcIsEncerrado(p) ? 'Reabrir' : 'Encerrar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteParcelamento(p.id);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      title="Excluir este parcelamento de todos os meses"
                    >
                      <Trash2 size={16} />
                    </button>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-muted/20">
                    <div className="p-5 border-b border-border/50 grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/10 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-1">
                          Início
                        </span>
                        <span className="font-medium text-foreground">
                          {p.data_inicio
                            ? new Date(p.data_inicio).toLocaleDateString(
                              "pt-BR"
                            )
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Previsão Término</span>
                        <span className={`font-medium ${calcIsEncerrado(p) ? 'text-destructive' : 'text-foreground'}`}>
                          {p.previsao_termino ? format(new Date(p.previsao_termino), 'dd/MM/yyyy') : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">
                          Envio Fixo
                        </span>
                        <span className="font-medium text-foreground">
                          {p.forma_envio || "—"}
                        </span>
                      </div>
                      <div className="md:col-span-1">
                        <span className="text-muted-foreground block mb-1">
                          Acesso:{" "}
                          <strong className="text-primary font-medium">
                            {p.metodo_login === "gov_br"
                              ? "Gov.br"
                              : p.metodo_login === "codigo_sn"
                                ? "Cód. AC. Simples Nacional"
                                : "Procuração"}
                          </strong>
                        </span>
                        <span className="font-mono text-foreground tracking-tight">
                          {p.metodo_login === "gov_br" &&
                            `L: ${p.login_gov_br || "-"} | S: ${p.senha_gov_br || "-"
                            }`}
                          {p.metodo_login === "codigo_sn" &&
                            `Cód: ${p.codigo_sn || "-"}`}
                          {p.metodo_login === "procuracao" && "Acesso Padrão"}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>Status no Mês</label>
                          <select
                            value={form.status || "pendente"}
                            onChange={(e) =>
                              updateForm(p.id, "status", e.target.value)
                            }
                            className={inputCls}
                          >
                            <option value="pendente">Pendente para Envio</option>
                            <option value="gerada">Em Andamento</option>
                            <option value="enviada">Concluída / Enviada</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Data do Envio (Opcional)</label>
                          <input
                            type="date"
                            value={form.data_envio || ""}
                            onChange={(e) =>
                              updateForm(p.id, "data_envio", e.target.value)
                            }
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Anotação Breve</label>
                          <input
                            value={form.observacoes || ""}
                            onChange={(e) =>
                              updateForm(p.id, "observacoes", e.target.value)
                            }
                            className={inputCls}
                            placeholder="Ex: Falta emitir boleto atualizado"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleSaveMensal(p.id)}
                          className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 active:scale-95"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          <Save size={16} /> Salvar Mês de{" "}
                          {competencia.split("-").reverse().join("/")}
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
